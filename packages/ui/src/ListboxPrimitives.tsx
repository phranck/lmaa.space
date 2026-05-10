import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
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
  Ref,
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
  contentClassName?: string;
  invalid?: boolean;
  leadingIcon?: ReactNode;
  open?: boolean;
  placeholder?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  trailingIcon?: ReactNode;
}

export function ControlTrigger({
  activeDescendant,
  children,
  className,
  contentClassName,
  controlSize = "field",
  controls,
  disabled,
  invalid = false,
  leadingIcon,
  open,
  placeholder,
  ref,
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
      ref={ref}
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
          contentClassName,
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
const EMPTY_DISABLED_VALUES: readonly string[] = [];

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
  closeOnSelect?: boolean;
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
  closeOnSelect = true,
  defaultActiveValue,
  disabledValues = EMPTY_DISABLED_VALUES,
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
  const portalPosition = useListboxPortalPosition({
    open,
    placementOffset,
    portal,
    triggerRef,
  });
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
      if (closeOnSelect) {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    },
    [closeOnSelect, disabledValueSet, onOpenChange, onSelect, triggerRef],
  );

  useListboxDismissal({
    onOpenChange,
    open,
    popoverRef,
    triggerRef,
  });

  useListboxKeyboardNavigation({
    currentActiveValue,
    enabledOptionValues,
    firstEnabledValue,
    onOpenChange,
    open,
    selectValue,
    setActiveValue,
    triggerRef,
  });

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
    <ListboxPopoverContent
      activeDescendantId={activeDescendantId}
      className={className}
      contextValue={contextValue}
      labelledBy={labelledBy}
      portal={portal}
      popoverRef={popoverRef}
      resolvedListboxId={resolvedListboxId}
      style={portalStyle}
      {...popoverProps}
    >
      {content}
    </ListboxPopoverContent>
  );

  const portalTarget =
    portalContainer ??
    (typeof document !== "undefined" ? document.body : undefined);

  return portal && portalTarget ? createPortal(popover, portalTarget) : popover;
}

interface ListboxPortalPositionParams {
  open: boolean;
  placementOffset: number;
  portal: boolean;
  triggerRef: RefObject<HTMLElement | null>;
}

function useListboxPortalPosition({
  open,
  placementOffset,
  portal,
  triggerRef,
}: ListboxPortalPositionParams) {
  const [portalPosition, setPortalPosition] =
    useState<ListboxPopoverPosition | null>(null);

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

  return portalPosition;
}

interface ListboxDismissalParams {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  popoverRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
}

function useListboxDismissal({
  onOpenChange,
  open,
  popoverRef,
  triggerRef,
}: ListboxDismissalParams) {
  const handleDocumentMouseDown = useEffectEvent(
    (event: globalThis.MouseEvent) => {
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
    },
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [open]);
}

interface ListboxKeyboardNavigationParams {
  currentActiveValue?: string;
  enabledOptionValues: readonly string[];
  firstEnabledValue?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  selectValue: (value: string) => void;
  setActiveValue: (value: string) => void;
  triggerRef: RefObject<HTMLElement | null>;
}

function useListboxKeyboardNavigation({
  currentActiveValue,
  enabledOptionValues,
  firstEnabledValue,
  onOpenChange,
  open,
  selectValue,
  setActiveValue,
  triggerRef,
}: ListboxKeyboardNavigationParams) {
  const handleDocumentKeyDown = useEffectEvent(
    (event: globalThis.KeyboardEvent) => {
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

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          event.stopPropagation();
          moveActiveValue(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          event.stopPropagation();
          moveActiveValue(-1);
          break;
        case "Home":
          event.preventDefault();
          event.stopPropagation();
          if (firstEnabledValue) {
            setActiveValue(firstEnabledValue);
          }
          break;
        case "End": {
          event.preventDefault();
          event.stopPropagation();
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
          event.stopPropagation();
          selectValue(currentActiveValue);
          break;
        default:
          break;
      }
    },
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener("keydown", handleDocumentKeyDown, true);
    return () =>
      document.removeEventListener("keydown", handleDocumentKeyDown, true);
  }, [open]);
}

interface ListboxPopoverContentProps
  extends HTMLAttributes<HTMLDivElement> {
  activeDescendantId?: string;
  contextValue: ListboxContextValue;
  labelledBy?: string;
  portal: boolean;
  popoverRef: RefObject<HTMLDivElement | null>;
  resolvedListboxId: string;
}

function ListboxPopoverContent({
  activeDescendantId,
  children,
  className,
  contextValue,
  labelledBy,
  portal,
  popoverRef,
  resolvedListboxId,
  style,
  ...popoverProps
}: ListboxPopoverContentProps) {
  return (
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
        style={style}
        tabIndex={-1}
        {...popoverProps}
      >
        {children}
      </div>
    </ListboxContext.Provider>
  );
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
  const context = use(ListboxContext);
  const disabledState = disabled ?? context?.disabledValues.has(value) ?? false;
  const selectedState = selected ?? context?.selectedValue === value;
  const activeState = active ?? context?.activeValue === value;
  const optionId = context?.getOptionId(value);

  const selectOption = useCallback(() => {
    onSelect?.(value);
    context?.selectValue(value);
  }, [context, onSelect, value]);

  const selectOptionFromClick = (event: MouseEvent<HTMLButtonElement>) => {
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
      onClick={selectOptionFromClick}
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
