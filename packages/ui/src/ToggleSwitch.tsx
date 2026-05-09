import type { ComponentPropsWithoutRef } from "react";

export interface ToggleSwitchProps
  extends Omit<ComponentPropsWithoutRef<"button">, "onChange" | "onClick"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  className,
  ...buttonProps
}: ToggleSwitchProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-[var(--color-primary)]" : "bg-[var(--ds-border-strong)]"
      }${className ? ` ${className}` : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
