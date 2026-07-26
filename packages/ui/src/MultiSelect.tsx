import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { type VariantProps, cva } from "class-variance-authority";
import { CheckIcon, XCircle, XIcon } from "lucide-react";
import * as React from "react";

import { ControlTrigger, ListboxOption, ListboxPopover } from "./ListboxPrimitives.tsx";

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const multiSelectVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-primary)] text-white",
        secondary:
          "border-[var(--ds-border)] bg-[var(--ds-section-header-bg,var(--ds-bg-elevated))] text-[var(--ds-text)]",
        destructive: "border-transparent bg-red-500 text-white",
        inverted: "border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

const SELECT_ALL_VALUE = "__lmaa_select_all__";

/**
 * Option model rendered by {@link MultiSelect}.
 */
export interface MultiSelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * UI copy contract for accessibility labels and shared action text.
 */
export interface MultiSelectMessages {
  selectAll: string;
  clearAllAriaLabel: string;
  clearSelectionAriaLabel: string;
  moreSelected: (count: number) => string;
  searchPlaceholder: string;
}

/**
 * Props for the shared multi-select component.
 */
export interface MultiSelectProps extends VariantProps<typeof multiSelectVariants> {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  messages: MultiSelectMessages;
  placeholder?: string;
  maxCount?: number;
  modalPopover?: boolean;
  className?: string;
  error?: string;
}

/**
 * Portal-based multi-select input used by dashboard and frontend forms.
 *
 * Keeps the API intentionally message-driven so all user-facing strings can be localized.
 */
export function MultiSelect({
  options,
  value,
  onValueChange,
  messages,
  variant,
  placeholder,
  maxCount = 3,
  className,
  error,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();

  const filteredOptions = searchQuery
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;
  const valueSet = new Set(value);

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(() => nextOpen);
    if (nextOpen) {
      setSearchQuery("");
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }

  function handleToggle() {
    handleOpenChange(!isOpen);
  }

  function toggleOption(optionValue: string) {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  }

  function handleToggleAll() {
    const filteredValues = filteredOptions.map((o) => o.value);
    const filteredValueSet = new Set(filteredValues);
    if (allSelected) {
      onValueChange(value.filter((item) => !filteredValueSet.has(item)));
    } else {
      onValueChange([...new Set([...value, ...filteredValues])]);
    }
  }

  function clearExtraOptions() {
    onValueChange(value.slice(0, maxCount));
  }

  function handleTriggerClick(e: React.MouseEvent<HTMLButtonElement>) {
    const target = e.target as HTMLElement;
    const removeValue = target.closest<HTMLElement>("[data-remove-value]")?.dataset.removeValue;

    if (removeValue) {
      e.stopPropagation();
      toggleOption(removeValue);
      return;
    }

    if (target.closest("[data-clear-extra]")) {
      e.stopPropagation();
      clearExtraOptions();
      return;
    }

    if (target.closest("[data-clear-all]")) {
      e.stopPropagation();
      onValueChange([]);
      return;
    }

    handleToggle();
  }

  const allSelected =
    filteredOptions.length > 0 && filteredOptions.every((o) => valueSet.has(o.value));
  const listboxOptionValues = [SELECT_ALL_VALUE, ...filteredOptions.map((option) => option.value)];
  const disabledValues = filteredOptions.reduce<string[]>((disabled, option) => {
    if (option.disabled) {
      disabled.push(option.value);
    }
    return disabled;
  }, []);

  function handleListboxSelect(selectedValue: string) {
    if (selectedValue === SELECT_ALL_VALUE) {
      handleToggleAll();
      return;
    }
    toggleOption(selectedValue);
  }

  const dropdown = (
    <ListboxPopover
      className="max-h-none overflow-hidden py-0"
      closeOnSelect={false}
      disabledValues={disabledValues}
      listboxId={listboxId}
      onOpenChange={handleOpenChange}
      onSelect={handleListboxSelect}
      open={isOpen}
      optionValues={listboxOptionValues}
      selectedValue={value[0]}
      triggerRef={triggerRef}
    >
      {/* Search */}
      <div className="px-2 pb-1 pt-2">
        <input
          aria-label={messages.searchPlaceholder}
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              handleOpenChange(false);
            }
          }}
          placeholder={messages.searchPlaceholder}
          className="w-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))] px-2.5 py-1.5 text-sm text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]"
        />
      </div>
      {/* List */}
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {/* Select all */}
        <ListboxOption
          value={SELECT_ALL_VALUE}
          selected={allSelected}
          leadingIcon={
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                allSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                  : "border-[var(--ds-border-strong)] opacity-50",
              )}
            >
              {allSelected && <CheckIcon className="size-2.5 text-white" strokeWidth={3} />}
            </span>
          }
        >
          <span className="text-[var(--ds-text)]">{messages.selectAll}</span>
        </ListboxOption>

        {/* Options */}
        {filteredOptions.map((opt) => {
          const isSelected = valueSet.has(opt.value);
          return (
            <ListboxOption
              key={opt.value}
              value={opt.value}
              selected={isSelected}
              disabled={opt.disabled}
              style={opt.style}
              leadingIcon={
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--ds-border-strong)]",
                  )}
                >
                  {isSelected && <CheckIcon className="size-2.5 text-white" strokeWidth={3} />}
                </span>
              }
            >
              <span className="inline-flex min-w-0 items-center gap-3">
                {opt.icon && <opt.icon className="size-4 text-[var(--ds-text-muted)]" />}
                <span className="truncate">{opt.label}</span>
              </span>
            </ListboxOption>
          );
        })}
      </div>
    </ListboxPopover>
  );

  return (
    <div className="relative">
      {/* Trigger */}
      <ControlTrigger
        className={cn("[&_svg]:pointer-events-auto", className)}
        contentClassName="flex flex-wrap items-center gap-1 overflow-visible whitespace-normal text-clip"
        controls={listboxId}
        invalid={Boolean(error)}
        multiline
        onClick={handleTriggerClick}
        open={isOpen}
        ref={triggerRef}
        style={{ backgroundColor: "var(--ds-form-control-bg, var(--ds-surface))" }}
        trailingIcon={
          <div className="flex shrink-0 items-center gap-0.5">
            {value.length > 0 && (
              <>
                <span
                  data-clear-all="true"
                  className="cursor-pointer p-0.5 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text)]"
                  aria-label={messages.clearAllAriaLabel}
                >
                  <XIcon className="size-3.5" />
                </span>
                <div className="mx-0.5 h-4 w-px bg-[var(--ds-border)]" />
              </>
            )}
            {isOpen ? (
              <CaretUpIcon
                weight="duotone"
                className="mx-0.5 size-4 text-[var(--ds-text-subtle)]"
              />
            ) : (
              <CaretDownIcon
                weight="duotone"
                className="mx-0.5 size-4 text-[var(--ds-text-subtle)]"
              />
            )}
          </div>
        }
      >
        {value.length > 0 ? (
          <>
            {value.slice(0, maxCount).map((val) => {
              const opt = options.find((o) => o.value === val);
              if (!opt) return null;
              return (
                <span
                  key={val}
                  className={cn(multiSelectVariants({ variant }), "min-w-0 max-w-full")}
                  style={opt.style}
                >
                  {opt.icon && <opt.icon className="size-3 shrink-0" />}
                  <span className="min-w-0 truncate">{opt.label}</span>
                  <span
                    data-remove-value={val}
                    className="shrink-0 cursor-pointer text-current opacity-60 hover:opacity-100"
                    aria-label={messages.clearSelectionAriaLabel}
                  >
                    <XCircle className="size-3" />
                  </span>
                </span>
              );
            })}
            {value.length > maxCount && (
              <span
                data-clear-extra="true"
                className={cn(multiSelectVariants({ variant }), "max-w-full cursor-pointer")}
              >
                <span className="min-w-0 truncate">
                  {messages.moreSelected(value.length - maxCount)}
                </span>
                <XCircle className="size-3 shrink-0 opacity-60" />
              </span>
            )}
          </>
        ) : (
          <span className="text-[var(--ds-text-subtle)]">{placeholder ?? ""}</span>
        )}
      </ControlTrigger>

      {dropdown}

      {error && <p className="text-[var(--ds-danger-text)] text-xs mt-1.5">{error}</p>}
    </div>
  );
}
