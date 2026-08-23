import { CaretDownIcon, CaretUpIcon, CaretUpDownIcon, ListIcon } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";

import {
  CheckboxPrimitive,
  SwitchPrimitive,
  type CheckboxPrimitiveProps,
  type SwitchPrimitiveProps,
} from "@lmaa/ui/choice-primitives";
import {
  FieldShell,
  InputPrimitive,
  TextareaPrimitive,
  type FieldControlSize,
  type FieldShellProps,
  type InputPrimitiveProps,
  type TextareaPrimitiveProps,
} from "@lmaa/ui/field-primitives";
import { ControlTrigger, ListboxOption, ListboxPopover } from "@lmaa/ui/listbox-primitives";
import {
  SegmentedControlPrimitive,
  type SegmentedControlPrimitiveProps,
} from "@lmaa/ui/segmented-control-primitive";
import {
  TabListPrimitive,
  TabPanelPrimitive,
  TabTriggerPrimitive,
  TabsPrimitive,
  type TabListPrimitiveProps,
  type TabPanelPrimitiveProps,
  type TabsPrimitiveProps,
  type TabTriggerPrimitiveProps,
} from "@lmaa/ui/tabs-primitives";

import { DashboardIconButton, type DashboardIconButtonProps } from "./DashboardButton.tsx";

export type DashboardFieldProps = FieldShellProps;

export function DashboardField(props: DashboardFieldProps) {
  return <FieldShell {...props} />;
}

export interface DashboardInputProps extends InputPrimitiveProps {
  error?: ReactNode;
  fieldClassName?: string;
  hint?: ReactNode;
  label?: ReactNode;
  optionalLabel?: ReactNode;
}

export function DashboardInput({
  error,
  fieldClassName,
  hint,
  id,
  invalid,
  label,
  optionalLabel,
  required,
  ...inputProps
}: DashboardInputProps) {
  if (!hasFieldShell(label, hint, error, optionalLabel)) {
    return (
      <InputPrimitive
        {...inputProps}
        id={id}
        invalid={invalid ?? Boolean(error)}
        required={required}
      />
    );
  }

  return (
    <DashboardField
      className={fieldClassName}
      controlId={id}
      error={error}
      hint={hint}
      label={label}
      optionalLabel={optionalLabel}
      required={required}
    >
      {(controlProps) => (
        <InputPrimitive
          {...inputProps}
          {...controlProps}
          invalid={invalid ?? Boolean(error)}
          required={required}
        />
      )}
    </DashboardField>
  );
}

export interface DashboardTextareaProps extends TextareaPrimitiveProps {
  error?: ReactNode;
  fieldClassName?: string;
  hint?: ReactNode;
  label?: ReactNode;
  optionalLabel?: ReactNode;
}

export function DashboardTextarea({
  error,
  fieldClassName,
  hint,
  id,
  invalid,
  label,
  optionalLabel,
  required,
  ...textareaProps
}: DashboardTextareaProps) {
  if (!hasFieldShell(label, hint, error, optionalLabel)) {
    return (
      <TextareaPrimitive
        {...textareaProps}
        id={id}
        invalid={invalid ?? Boolean(error)}
        required={required}
      />
    );
  }

  return (
    <DashboardField
      className={fieldClassName}
      controlId={id}
      error={error}
      hint={hint}
      label={label}
      optionalLabel={optionalLabel}
      required={required}
    >
      {(controlProps) => (
        <TextareaPrimitive
          {...textareaProps}
          {...controlProps}
          invalid={invalid ?? Boolean(error)}
          required={required}
        />
      )}
    </DashboardField>
  );
}

const selectSizeClass: Record<FieldControlSize, string> = {
  field: "h-[var(--ds-control-h-field)] px-3",
  large: "h-[var(--ds-control-h-field-large)] px-4",
};

/**
 * How the open list arranges its options.
 *
 * `list` is one option per line, which is right for names. `row` puts them
 * beside each other, which is right when each option carries a picture and the
 * picture is what a person compares.
 */
export type DashboardComboboxOptionsLayout = "list" | "row";

export interface DashboardComboboxOption {
  addOn?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  leadingIcon?: ReactNode;
  triggerLabel?: ReactNode;
  value: string;
}

export interface DashboardComboboxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value"
> {
  controlSize?: FieldControlSize;
  error?: ReactNode;
  fieldClassName?: string;
  fullWidth?: boolean;
  hint?: ReactNode;
  label?: ReactNode;
  matchTriggerWidth?: boolean;
  minWidthFromOptions?: boolean;
  onValueChange: (value: string) => void;
  optionalLabel?: ReactNode;
  options: readonly DashboardComboboxOption[];
  /** How the open list arranges its options. One per line by default. */
  optionsLayout?: DashboardComboboxOptionsLayout;
  placeholder?: ReactNode;
  portal?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  value?: string;
}

export function DashboardCombobox({
  className,
  controlSize = "field",
  disabled,
  error,
  fieldClassName,
  fullWidth,
  hint,
  id,
  label,
  matchTriggerWidth = true,
  minWidthFromOptions = false,
  onClick,
  onKeyDown,
  onValueChange,
  optionalLabel,
  options,
  optionsLayout = "list",
  placeholder,
  portal,
  required,
  searchable,
  searchPlaceholder,
  style,
  value,
  ...buttonProps
}: DashboardComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | undefined>();
  const [measuredOptionsMinWidth, setMeasuredOptionsMinWidth] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const measurementRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedListboxId = useId();
  const shouldFillWidth = fullWidth ?? (!minWidthFromOptions && !hasExplicitWidthClass(className));
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions =
    searchable && searchQuery.trim()
      ? options.filter((option) =>
          optionLabelToString(option.label)
            .toLowerCase()
            .includes(searchQuery.trim().toLowerCase()),
        )
      : options;
  const optionValues = filteredOptions.map((option) => option.value);
  const disabledValues = filteredOptions.reduce<string[]>((values, option) => {
    if (option.disabled) {
      values.push(option.value);
    }
    return values;
  }, []);
  const disabledValueSet = new Set(disabledValues);
  const enabledOptionValues = optionValues.filter(
    (optionValue) => !disabledValueSet.has(optionValue),
  );
  const allEnabledOptionValues = options.reduce<string[]>((values, option) => {
    if (!option.disabled) {
      values.push(option.value);
    }
    return values;
  }, []);
  const triggerStyle =
    minWidthFromOptions && measuredOptionsMinWidth
      ? { ...style, minWidth: measuredOptionsMinWidth }
      : style;

  useLayoutEffect(() => {
    if (!minWidthFromOptions) {
      return;
    }

    const measurementRoot = measurementRef.current;
    if (!measurementRoot) {
      return;
    }

    const measure = () => {
      const measuredOptions = measurementRoot.querySelectorAll<HTMLElement>(
        "[data-dashboard-combobox-measure-option]",
      );
      const nextMinWidth = Math.ceil(
        Math.max(
          ...Array.from(measuredOptions, (option) => option.getBoundingClientRect().width),
          0,
        ),
      );
      setMeasuredOptionsMinWidth((current) => (current === nextMinWidth ? current : nextMinWidth));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(measurementRoot);
    for (const measuredOption of measurementRoot.querySelectorAll<HTMLElement>(
      "[data-dashboard-combobox-measure-option]",
    )) {
      observer.observe(measuredOption);
    }

    return () => observer.disconnect();
  }, [className, controlSize, minWidthFromOptions, options, placeholder]);

  function openCombobox() {
    const nextActiveValue =
      value && allEnabledOptionValues.includes(value) ? value : allEnabledOptionValues[0];
    setSearchQuery("");
    setActiveValue(nextActiveValue);
    setOpen(true);
  }

  function closeCombobox() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectValue(nextValue: string) {
    onValueChange(nextValue);
    closeCombobox();
  }

  function moveActiveValue(direction: 1 | -1) {
    if (enabledOptionValues.length === 0) {
      return;
    }
    const currentIndex = activeValue ? enabledOptionValues.indexOf(activeValue) : -1;
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + direction + enabledOptionValues.length) % enabledOptionValues.length
        : direction > 0
          ? 0
          : enabledOptionValues.length - 1;
    setActiveValue(enabledOptionValues[nextIndex]);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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
        if (enabledOptionValues[0]) {
          setActiveValue(enabledOptionValues[0]);
        }
        break;
      case "End": {
        event.preventDefault();
        const lastValue = enabledOptionValues[enabledOptionValues.length - 1];
        if (lastValue) {
          setActiveValue(lastValue);
        }
        break;
      }
      case "Enter":
        event.preventDefault();
        if (activeValue) {
          selectValue(activeValue);
        }
        break;
      case "Escape":
        event.preventDefault();
        closeCombobox();
        break;
      default:
        break;
    }
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }

    if (!open) {
      if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        return;
      }
      event.preventDefault();
      openCombobox();
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
        if (enabledOptionValues[0]) {
          setActiveValue(enabledOptionValues[0]);
        }
        break;
      case "End": {
        event.preventDefault();
        const lastValue = enabledOptionValues[enabledOptionValues.length - 1];
        if (lastValue) {
          setActiveValue(lastValue);
        }
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeValue) {
          selectValue(activeValue);
        }
        break;
      case "Escape":
        event.preventDefault();
        closeCombobox();
        break;
      default:
        break;
    }
  }

  const content = (controlProps?: {
    "aria-describedby"?: string;
    "aria-invalid"?: true;
    "aria-required"?: true;
    id: string;
  }) => (
    <>
      <ControlTrigger
        {...buttonProps}
        {...controlProps}
        className={className}
        controls={generatedListboxId}
        controlSize={controlSize}
        disabled={disabled}
        fullWidth={shouldFillWidth}
        invalid={Boolean(error)}
        aria-required={controlProps?.["aria-required"] ?? (required || undefined)}
        style={triggerStyle}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && !disabled) {
            if (open) {
              setOpen(false);
            } else {
              openCombobox();
            }
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        open={open}
        placeholder={placeholder}
        ref={triggerRef}
        leadingIcon={selectedOption?.leadingIcon}
        trailingIcon={<CaretDownIcon className="size-4" weight="duotone" />}
      >
        {selectedOption?.triggerLabel ?? selectedOption?.label ?? null}
      </ControlTrigger>
      <ListboxPopover
        activeValue={activeValue}
        className={optionsLayout === "row" ? "flex flex-row items-stretch gap-1 p-1" : undefined}
        disabledValues={disabledValues}
        listboxId={generatedListboxId}
        matchTriggerWidth={matchTriggerWidth}
        onActiveValueChange={setActiveValue}
        onOpenChange={setOpen}
        onSelect={selectValue}
        open={open}
        optionValues={optionValues}
        portal={portal}
        selectedValue={value}
        triggerRef={triggerRef}
      >
        {searchable && (
          <div className="border-b border-[var(--ds-border-subtle)] px-2 pb-2">
            <DashboardInput
              aria-label={typeof searchPlaceholder === "string" ? searchPlaceholder : undefined}
              onChange={(event) => {
                const nextSearchQuery = event.currentTarget.value;
                setSearchQuery(nextSearchQuery);
                const nextOptions = nextSearchQuery.trim()
                  ? options.filter((option) =>
                      optionLabelToString(option.label)
                        .toLowerCase()
                        .includes(nextSearchQuery.trim().toLowerCase()),
                    )
                  : options;
                const nextEnabledValue = nextOptions.find((option) => !option.disabled)?.value;
                setActiveValue(nextEnabledValue);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              value={searchQuery}
            />
          </div>
        )}
        {filteredOptions.map((option) => (
          <ListboxOption
            addOn={option.addOn}
            className={optionsLayout === "row" ? "w-auto flex-1 justify-center rounded-control" : undefined}
            key={option.value}
            leadingIcon={option.leadingIcon}
            selected={option.value === value}
            value={option.value}
          >
            {option.label}
          </ListboxOption>
        ))}
      </ListboxPopover>
      {minWidthFromOptions && (
        <div
          aria-hidden="true"
          className="invisible pointer-events-none fixed left-0 top-0 -z-10 flex flex-col items-start"
          ref={measurementRef}
        >
          {placeholder && (
            <DashboardComboboxMeasureOption className={className} controlSize={controlSize}>
              {placeholder}
            </DashboardComboboxMeasureOption>
          )}
          {options.map((option) => (
            <DashboardComboboxMeasureOption
              className={className}
              controlSize={controlSize}
              key={option.value}
              leadingIcon={option.leadingIcon}
            >
              {option.triggerLabel ?? option.label}
            </DashboardComboboxMeasureOption>
          ))}
        </div>
      )}
    </>
  );

  if (!hasFieldShell(label, hint, error, optionalLabel)) {
    return content(id ? { id } : undefined);
  }

  return (
    <DashboardField
      className={fieldClassName}
      controlId={id}
      error={error}
      hint={hint}
      label={label}
      optionalLabel={optionalLabel}
      required={required}
    >
      {content}
    </DashboardField>
  );
}

function DashboardComboboxMeasureOption({
  children,
  className,
  controlSize,
  leadingIcon,
}: {
  children: ReactNode;
  className?: string;
  controlSize: FieldControlSize;
  leadingIcon?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "inline-flex box-border items-center gap-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] text-sm text-[var(--ds-text)]",
        selectSizeClass[controlSize],
        stripWidthClasses(className),
      )}
      data-dashboard-combobox-measure-option="true"
    >
      {leadingIcon && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {leadingIcon}
        </span>
      )}
      <span className="whitespace-nowrap">{children}</span>
      <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
        <CaretDownIcon className="size-4" weight="duotone" />
      </span>
    </div>
  );
}

export interface DashboardNumberInputProps extends Omit<DashboardInputProps, "type"> {}

export function DashboardNumberInput(props: DashboardNumberInputProps) {
  return <DashboardInput {...props} type="number" />;
}

export type DashboardCheckboxFieldProps = CheckboxPrimitiveProps;

export function DashboardCheckboxField(props: DashboardCheckboxFieldProps) {
  return <CheckboxPrimitive {...props} />;
}

export interface DashboardSwitchFieldProps extends SwitchPrimitiveProps {
  description?: ReactNode;
  label?: ReactNode;
}

export function DashboardSwitchField({
  description,
  label,
  ...switchProps
}: DashboardSwitchFieldProps) {
  return (
    <label className="flex items-start gap-3">
      <SwitchPrimitive {...switchProps} />
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm text-[var(--ds-text)]">{label}</span>}
          {description && (
            <span className="block text-xs text-[var(--ds-text-muted)]">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}

export function DashboardTabs(props: TabsPrimitiveProps) {
  return <TabsPrimitive {...props} />;
}

export function DashboardTabList(props: TabListPrimitiveProps) {
  return <TabListPrimitive {...props} />;
}

export function DashboardTabTrigger(props: TabTriggerPrimitiveProps) {
  return <TabTriggerPrimitive {...props} />;
}

export function DashboardTabPanel(props: TabPanelPrimitiveProps) {
  return <TabPanelPrimitive {...props} />;
}

export function DashboardSegmentedControl<T extends string = string>(
  props: SegmentedControlPrimitiveProps<T>,
) {
  return <SegmentedControlPrimitive {...props} />;
}

export type TableSortDirection = "asc" | "desc" | null;

export interface TableSortHeaderProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  direction?: TableSortDirection;
  label: ReactNode;
}

export function TableSortHeader({
  className,
  direction = null,
  label,
  type = "button",
  ...buttonProps
}: TableSortHeaderProps) {
  return (
    <button
      {...buttonProps}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 text-left font-medium transition-colors hover:text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]",
        className,
      )}
      type={type}
    >
      <span>{label}</span>
      <TableSortIcon direction={direction} />
    </button>
  );
}

export interface DashboardDragHandleProps extends Omit<DashboardIconButtonProps, "children"> {}

export function DashboardDragHandle({
  className,
  variant = "ghost",
  ...props
}: DashboardDragHandleProps) {
  return (
    <DashboardIconButton
      {...props}
      className={cx("touch-none cursor-grab active:cursor-grabbing", className)}
      variant={variant}
    >
      <ListIcon className="size-4" weight="bold" />
    </DashboardIconButton>
  );
}

function hasFieldShell(
  label: ReactNode,
  hint: ReactNode,
  error: ReactNode,
  optionalLabel: ReactNode,
) {
  return Boolean(label || hint || error || optionalLabel);
}

function hasExplicitWidthClass(className: string | undefined) {
  return /(?:^|\s)w-(?!full(?:\s|$))[^\s]+/.test(className ?? "");
}

function stripWidthClasses(className: string | undefined) {
  return className
    ?.split(/\s+/)
    .filter((part) => part && !/^(?:w|min-w|max-w)-/.test(part))
    .join(" ");
}

function optionLabelToString(label: ReactNode) {
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }
  return "";
}

function TableSortIcon({ direction }: { direction: TableSortDirection }) {
  const Icon =
    direction === "asc" ? CaretUpIcon : direction === "desc" ? CaretDownIcon : CaretUpDownIcon;

  return (
    <Icon
      aria-hidden="true"
      className={cx("size-3.5 shrink-0", direction ? "text-[var(--color-primary)]" : "opacity-40")}
      weight="duotone"
    />
  );
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
