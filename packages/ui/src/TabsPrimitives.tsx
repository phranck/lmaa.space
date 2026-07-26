import { createContext, use, useId } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from "react";

import { cx } from "./classNames";

export type TabsActivationMode = "automatic" | "manual";
export type TabsOrientation = "horizontal" | "vertical";

interface TabsPrimitiveContextValue {
  activationMode: TabsActivationMode;
  getPanelId: (value: string) => string;
  getTriggerId: (value: string) => string;
  onValueChange: (value: string) => void;
  orientation: TabsOrientation;
  value: string;
}

const TabsPrimitiveContext =
  createContext<TabsPrimitiveContextValue | null>(null);

function useTabsPrimitiveContext(componentName: string) {
  const context = use(TabsPrimitiveContext);
  if (!context) {
    throw new Error(
      `${componentName} must be used within <TabsPrimitive>.`,
    );
  }
  return context;
}

export interface TabsPrimitiveProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  activationMode?: TabsActivationMode;
  children: ReactNode;
  idBase?: string;
  onValueChange: (value: string) => void;
  orientation?: TabsOrientation;
  value: string;
}

export function TabsPrimitive({
  activationMode = "automatic",
  children,
  className,
  idBase,
  onValueChange,
  orientation = "horizontal",
  value,
  ...rootProps
}: TabsPrimitiveProps) {
  const generatedId = useId();
  const resolvedIdBase = idBase ?? `${generatedId}-tabs`;
  const contextValue: TabsPrimitiveContextValue = {
    activationMode,
    getPanelId: (tabValue) => `${resolvedIdBase}-panel-${toIdPart(tabValue)}`,
    getTriggerId: (tabValue) =>
      `${resolvedIdBase}-trigger-${toIdPart(tabValue)}`,
    onValueChange,
    orientation,
    value,
  };

  return (
    <TabsPrimitiveContext.Provider value={contextValue}>
      <div className={className} {...rootProps}>
        {children}
      </div>
    </TabsPrimitiveContext.Provider>
  );
}

export interface TabListPrimitiveProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TabListPrimitive({
  children,
  className,
  onKeyDown,
  ...listProps
}: TabListPrimitiveProps) {
  const { activationMode, orientation } =
    useTabsPrimitiveContext("TabListPrimitive");

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const keyDirection = getTabKeyDirection(event.key, orientation);
    if (keyDirection === null && event.key !== "Home" && event.key !== "End") {
      return;
    }

    const tabs = getEnabledTabTriggers(event.currentTarget);
    if (tabs.length === 0) {
      return;
    }

    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex >= 0 ? currentIndex : 0;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else if (keyDirection !== null) {
      nextIndex =
        currentIndex >= 0
          ? (currentIndex + keyDirection + tabs.length) % tabs.length
          : keyDirection > 0
            ? 0
            : tabs.length - 1;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab?.focus();
    if (activationMode === "automatic") {
      nextTab?.click();
    }
  };

  return (
    <div
      aria-orientation={orientation}
      className={cx(
        orientation === "vertical"
          ? "flex flex-col gap-1"
          : "flex gap-1 border-b border-[var(--ds-border)]",
        className,
      )}
      onKeyDown={handleKeyDown}
      role="tablist"
      {...listProps}
    >
      {children}
    </div>
  );
}

export interface TabTriggerPrimitiveProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
}

export function TabTriggerPrimitive({
  children,
  className,
  disabled,
  onClick,
  type = "button",
  value,
  ...buttonProps
}: TabTriggerPrimitiveProps) {
  const context = useTabsPrimitiveContext("TabTriggerPrimitive");
  const isSelected = context.value === value;

  return (
    <button
      aria-controls={context.getPanelId(value)}
      aria-selected={isSelected}
      className={cx(
        "inline-flex items-center justify-center whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
        "disabled:pointer-events-none disabled:opacity-[var(--ds-control-disabled-opacity)]",
        isSelected
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--ds-text-secondary)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]",
        className,
      )}
      data-tabs-trigger="true"
      data-value={value}
      disabled={disabled}
      id={context.getTriggerId(value)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) {
          return;
        }
        context.onValueChange(value);
      }}
      role="tab"
      tabIndex={isSelected ? 0 : -1}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export interface TabPanelPrimitiveProps
  extends HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  value: string;
}

export function TabPanelPrimitive({
  children,
  className,
  forceMount = false,
  value,
  ...panelProps
}: TabPanelPrimitiveProps) {
  const context = useTabsPrimitiveContext("TabPanelPrimitive");
  const isSelected = context.value === value;

  if (!isSelected && !forceMount) {
    return null;
  }

  return (
    <div
      aria-labelledby={context.getTriggerId(value)}
      className={className}
      hidden={!isSelected}
      id={context.getPanelId(value)}
      role="tabpanel"
      tabIndex={0}
      {...panelProps}
    >
      {children}
    </div>
  );
}

function getEnabledTabTriggers(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(
      "[data-tabs-trigger='true']:not(:disabled)",
    ),
  );
}

function getTabKeyDirection(key: string, orientation: TabsOrientation) {
  if (orientation === "vertical") {
    if (key === "ArrowDown") {
      return 1;
    }
    if (key === "ArrowUp") {
      return -1;
    }
    return null;
  }

  if (key === "ArrowRight") {
    return 1;
  }
  if (key === "ArrowLeft") {
    return -1;
  }
  return null;
}

function toIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}
