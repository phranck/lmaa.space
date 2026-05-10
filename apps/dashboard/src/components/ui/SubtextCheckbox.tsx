import type { ReactNode } from "react";

interface SubtextCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SubtextCheckbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
}: SubtextCheckboxProps) {
  return (
    <label
      className={`flex items-center gap-2 select-none ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 rounded border-[var(--ds-border)] accent-[var(--color-primary)]"
      />
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium text-[var(--ds-text)]">{label}</span>
        {description && (
          <span className="block text-xs text-[var(--ds-text-muted)]">{description}</span>
        )}
      </span>
    </label>
  );
}
