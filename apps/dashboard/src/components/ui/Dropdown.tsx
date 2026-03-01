import { useEffect, useRef, useState } from "react";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional ReactNode rendered left of the label in trigger and list items. */
  icon?: React.ReactNode;
}

interface DropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  /** Optional section label rendered above the trigger button. */
  label?: string;
  className?: string;
}

/**
 * Generic single-select dropdown with optional icons per option.
 *
 * Renders a styled trigger button showing the current selection and an
 * absolute-positioned list panel that closes on outside click.
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
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ""}`}>
      {label && (
        <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
          {label}
        </span>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full h-9 px-3 flex items-center gap-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] hover:border-[var(--color-primary)] transition-colors"
        >
          {current?.icon && <span className="shrink-0">{current.icon}</span>}
          <span className="flex-1 text-left">{current?.label}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 text-[var(--ds-text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open && (
          <div className="absolute z-20 right-0 mt-1 py-1 min-w-full bg-[var(--ds-surface)] border border-[var(--ds-border)] rounded-xl shadow-lg overflow-hidden">
            {options.map(({ value: v, label: l, icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onChange(v);
                  setOpen(false);
                }}
                className={`w-full h-8 flex items-center gap-2 px-3 text-sm transition-colors ${
                  value === v
                    ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)] font-medium"
                    : "text-[var(--ds-text)] hover:bg-[var(--ds-surface-hover)]"
                }`}
              >
                {icon && <span className="shrink-0">{icon}</span>}
                <span>{l}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
