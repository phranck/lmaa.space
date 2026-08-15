import type { ReactNode } from "react";

import {
  DashboardCombobox,
  type DashboardComboboxOption,
} from "@/components/ui/DashboardControls.tsx";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional ReactNode rendered left of the label in trigger and list items. */
  icon?: ReactNode;
  /** Optional numeric badge rendered right-aligned when > 0. */
  count?: number;
}

interface DropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  /** Optional section label rendered above the trigger button. */
  label?: string;
  className?: string;
  /** When true, shows a search input at the top of the dropdown list. */
  searchable?: boolean;
  /** Placeholder text for the search input (only used when searchable is true). */
  searchPlaceholder?: string;
  /**
   * When true, the listbox is rendered in a portal attached to document.body.
   * Default true so toolbar dropdowns stay anchored to their trigger even when
   * the header uses portal slots and nested flex containers.
   */
  portal?: boolean;
}

/**
 * Generic single-select dropdown with optional icons per option.
 *
 * Thin compatibility wrapper around the shared dashboard combobox primitive.
 *
 * @param props - Value, options, change handler and optional label.
 * @returns Accessible dropdown control.
 */
export function Dropdown<T extends string = string>({
  value,
  onChange,
  options,
  label,
  className,
  searchable,
  searchPlaceholder,
  portal,
}: DropdownProps<T>) {
  return (
    <DashboardCombobox
      className={label ? undefined : className}
      fieldClassName={label ? className : undefined}
      label={label}
      onValueChange={(nextValue) => onChange(nextValue as T)}
      options={options.map(toComboboxOption)}
      portal={portal ?? true}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
      value={value}
    />
  );
}

function toComboboxOption<T extends string>(option: DropdownOption<T>): DashboardComboboxOption {
  return {
    addOn: hasPositiveCount(option.count) ? <DropdownCountBadge count={option.count} /> : undefined,
    label: option.label,
    leadingIcon: option.icon,
    triggerLabel: hasPositiveCount(option.count) ? (
      <DropdownTriggerLabel count={option.count} label={option.label} />
    ) : (
      option.label
    ),
    value: option.value,
  };
}

function DropdownTriggerLabel({ count, label }: { count: number; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate">{label}</span>
      <DropdownCountBadge count={count} />
    </span>
  );
}

function DropdownCountBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-[var(--ds-surface-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--ds-text-muted)]">
      {count}
    </span>
  );
}

function hasPositiveCount(count: number | undefined): count is number {
  return typeof count === "number" && count > 0;
}
