import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cx } from "./classNames";

type ControlTriggerSize = "field" | "large";

export interface ControlTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  activeDescendant?: string;
  controls?: string;
  controlSize?: ControlTriggerSize;
  invalid?: boolean;
  leadingIcon?: ReactNode;
  open?: boolean;
  placeholder?: ReactNode;
  trailingIcon?: ReactNode;
}

export function ControlTrigger({
  activeDescendant,
  children,
  className,
  controlSize = "field",
  controls,
  disabled,
  invalid = false,
  leadingIcon,
  open,
  placeholder,
  trailingIcon,
  type = "button",
  ...buttonProps
}: ControlTriggerProps) {
  const {
    "aria-controls": ariaControls,
    "aria-expanded": ariaExpanded,
    "aria-haspopup": ariaHasPopup,
    "aria-invalid": ariaInvalid,
    ...restButtonProps
  } = buttonProps;
  const hasContent = children !== undefined && children !== null;

  return (
    <button
      aria-activedescendant={activeDescendant}
      aria-controls={ariaControls ?? controls}
      aria-expanded={ariaExpanded ?? open}
      aria-haspopup={ariaHasPopup ?? "listbox"}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      className={cx(
        "inline-flex w-full items-center gap-2 rounded-control border bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-sm text-[var(--ds-text)] transition-colors",
        "focus:border-[var(--ds-border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-[var(--ds-control-disabled-opacity)]",
        controlSize === "large"
          ? "h-[var(--ds-control-h-field-large)] px-4"
          : "h-[var(--ds-control-h-field)] px-3",
        invalid
          ? "border-[var(--ds-danger-border,var(--ds-danger))]"
          : "border-[var(--ds-border)]",
        open && "border-[var(--ds-border-focus)] ring-2 ring-[var(--ds-focus-ring)]",
        className,
      )}
      disabled={disabled}
      type={type}
      {...restButtonProps}
    >
      {leadingIcon && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {leadingIcon}
        </span>
      )}
      <span
        className={cx(
          "min-w-0 flex-1 truncate text-left",
          !hasContent && "text-[var(--ds-text-muted)]",
        )}
      >
        {hasContent ? children : placeholder}
      </span>
      {trailingIcon && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {trailingIcon}
        </span>
      )}
    </button>
  );
}

interface ListboxContextValue {
  activeValue?: string;
  disabledValues: ReadonlySet<string>;
  getOptionId: (value: string) => string | undefined;
  listboxId: string;
  selectedValue?: string;
  selectValue: (value: string) => void;
  setActiveValue: (value: string) => void;
}

const ListboxContext = createContext<ListboxContextValue | null>(null);

interface ListboxPopoverPosition {
  left: number;
  top: number;
  width: number;
}

export interface ListboxPopoverRenderState {
  activeDescendantId?: string;
  activeValue?: string;
  listboxId: string;
}

export interface ListboxPopoverProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  activeValue?: string;
  children: ReactNode | ((state: ListboxPopoverRenderState) => ReactNode);
  defaultActiveValue?: string;
  disabledValues?: readonly string[];
  labelledBy?: string;
  listboxId?: string;
  matchTriggerWidth?: boolean;
  onActiveValueChange?: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect?: (value: string) => void;
  open: boolean;
  optionValues: readonly string[];
  placementOffset?: number;
  portal?: boolean;
  portalContainer?: HTMLElement;
  selectedValue?: string;
  triggerRef: RefObject<HTMLElement | null>;
}

export function ListboxPopover({
  activeValue,
  children,
  className,
  defaultActiveValue,
  disabledValues = [],
  labelledBy,
  listboxId,
  matchTriggerWidth = true,
  onActiveValueChange,
  onOpenChange,
  onSelect,
  open,
  optionValues,
  placementOffset = 6,
  portal = true,
  portalContainer,
  selectedValue,
  style,
  triggerRef,
  ...popoverProps
}: ListboxPopoverProps) {
  const generatedId = useId();
  const resolvedListboxId = listboxId ?? `${generatedId}-listbox`;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] =
    useState<ListboxPopoverPosition | null>(null);
  const disabledValueSet = useMemo(
    () => new Set(disabledValues),
    [disabledValues],
  );
  const enabledOptionValues = useMemo(
    () => optionValues.filter((value) => !disabledValueSet.has(value)),
    [disabledValueSet, optionValues],
  );
  const firstEnabledValue = enabledOptionValues[0];
  const [internalActiveValue, setInternalActiveValue] = useState<
    string | undefined
  >(defaultActiveValue ?? selectedValue ?? firstEnabledValue);
  const currentActiveValue = activeValue ?? internalActiveValue;

  const setActiveValue = useCallback(
    (nextValue: string) => {
      if (disabledValueSet.has(nextValue)) {
        return;
      }
      if (activeValue === undefined) {
        setInternalActiveValue(nextValue);
      }
      onActiveValueChange?.(nextValue);
    },
    [activeValue, disabledValueSet, onActiveValueChange],
  );

  const getOptionId = useCallback(
    (value: string) => {
      const optionIndex = optionValues.indexOf(value);
      return optionIndex >= 0
        ? `${resolvedListboxId}-option-${optionIndex}`
        : undefined;
    },
    [optionValues, resolvedListboxId],
  );

  const selectValue = useCallback(
    (value: string) => {
      if (disabledValueSet.has(value)) {
        return;
      }
      onSelect?.(value);
      onOpenChange(false);
      triggerRef.current?.focus();
    },
    [disabledValueSet, onOpenChange, onSelect, triggerRef],
  );

  useEffect(() => {
    if (!open || enabledOptionValues.length === 0) {
      return;
    }
    if (
      currentActiveValue &&
      enabledOptionValues.includes(currentActiveValue)
    ) {
      return;
    }
    if (selectedValue && enabledOptionValues.includes(selectedValue)) {
      setActiveValue(selectedValue);
      return;
    }
    setActiveValue(enabledOptionValues[0]);
  }, [
    currentActiveValue,
    enabledOptionValues,
    open,
    selectedValue,
    setActiveValue,
  ]);

  useLayoutEffect(() => {
    if (!open || !portal) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      setPortalPosition({
        left: rect.left,
        top: rect.bottom + placementOffset,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placementOffset, portal, triggerRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerRef.current?.contains(target)) {
        return;
      }
      if (popoverRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onOpenChange, open, triggerRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const moveActiveValue = (direction: 1 | -1) => {
      if (enabledOptionValues.length === 0) {
        return;
      }

      const currentIndex = currentActiveValue
        ? enabledOptionValues.indexOf(currentActiveValue)
        : -1;
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + direction + enabledOptionValues.length) %
            enabledOptionValues.length
          : direction > 0
            ? 0
            : enabledOptionValues.length - 1;

      setActiveValue(enabledOptionValues[nextIndex]);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onOpenChange(false);
        triggerRef.current?.focus();
        return;
      }

      if (isTextEntryTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveActiveValue(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActiveValue(-1);
          break;
        case "Home":
          event.preventDefault();
          if (firstEnabledValue) {
            setActiveValue(firstEnabledValue);
          }
          break;
        case "End": {
          event.preventDefault();
          const lastEnabledValue =
            enabledOptionValues[enabledOptionValues.length - 1];
          if (lastEnabledValue) {
            setActiveValue(lastEnabledValue);
          }
          break;
        }
        case "Enter":
        case " ":
          if (!currentActiveValue) {
            return;
          }
          event.preventDefault();
          selectValue(currentActiveValue);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [
    currentActiveValue,
    enabledOptionValues,
    firstEnabledValue,
    onOpenChange,
    open,
    selectValue,
    setActiveValue,
    triggerRef,
  ]);

  if (!open) {
    return null;
  }

  const activeDescendantId = currentActiveValue
    ? getOptionId(currentActiveValue)
    : undefined;
  const contextValue: ListboxContextValue = {
    activeValue: currentActiveValue,
    disabledValues: disabledValueSet,
    getOptionId,
    listboxId: resolvedListboxId,
    selectedValue,
    selectValue,
    setActiveValue,
  };
  const renderState: ListboxPopoverRenderState = {
    activeDescendantId,
    activeValue: currentActiveValue,
    listboxId: resolvedListboxId,
  };
  const portalStyle: CSSProperties | undefined =
    portal && portalPosition
      ? {
          left: portalPosition.left,
          minWidth: matchTriggerWidth ? portalPosition.width : undefined,
          position: "fixed",
          top: portalPosition.top,
          width: matchTriggerWidth ? portalPosition.width : undefined,
          ...style,
        }
      : style;
  const content =
    typeof children === "function" ? children(renderState) : children;
  const popover = (
    <ListboxContext.Provider value={contextValue}>
      <div
        aria-activedescendant={activeDescendantId}
        aria-labelledby={labelledBy}
        className={cx(
          "max-h-64 overflow-y-auto rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] py-1 shadow-[var(--ds-overlay-shadow)]",
          "z-[var(--ds-overlay-z-dropdown)]",
          !portal && "absolute mt-1 min-w-full",
          className,
        )}
        id={resolvedListboxId}
        ref={popoverRef}
        role="listbox"
        style={portalStyle}
        tabIndex={-1}
        {...popoverProps}
      >
        {content}
      </div>
    </ListboxContext.Provider>
  );

  const portalTarget =
    portalContainer ??
    (typeof document !== "undefined" ? document.body : undefined);

  return portal && portalTarget ? createPortal(popover, portalTarget) : popover;
}

export interface ListboxOptionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect" | "value"> {
  active?: boolean;
  addOn?: ReactNode;
  leadingIcon?: ReactNode;
  onSelect?: (value: string) => void;
  selected?: boolean;
  value: string;
}

export function ListboxOption({
  active,
  addOn,
  children,
  className,
  disabled,
  leadingIcon,
  onClick,
  onKeyDown,
  onMouseEnter,
  onSelect,
  selected,
  type = "button",
  value,
  ...buttonProps
}: ListboxOptionProps) {
  const context = useContext(ListboxContext);
  const disabledState = disabled ?? context?.disabledValues.has(value) ?? false;
  const selectedState = selected ?? context?.selectedValue === value;
  const activeState = active ?? context?.activeValue === value;
  const optionId = context?.getOptionId(value);

  const selectOption = useCallback(() => {
    onSelect?.(value);
    context?.selectValue(value);
  }, [context, onSelect, value]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabledState) {
      return;
    }
    selectOption();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabledState) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    selectOption();
  };

  const handleMouseEnter = (event: MouseEvent<HTMLButtonElement>) => {
    onMouseEnter?.(event);
    if (event.defaultPrevented || disabledState) {
      return;
    }
    context?.setActiveValue(value);
  };

  return (
    <button
      aria-selected={selectedState}
      className={cx(
        "flex min-h-[var(--ds-control-h-menu-item)] w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
        "disabled:pointer-events-none disabled:opacity-[var(--ds-control-disabled-opacity)]",
        activeState && "bg-[var(--ds-hover)] text-[var(--ds-text)]",
        selectedState && "font-medium text-[var(--ds-text)]",
        !selectedState && "text-[var(--ds-text-secondary)]",
        className,
      )}
      disabled={disabledState}
      id={optionId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      role="option"
      type={type}
      {...buttonProps}
    >
      {leadingIcon && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {leadingIcon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {addOn && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {addOn}
        </span>
      )}
    </button>
  );
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}
