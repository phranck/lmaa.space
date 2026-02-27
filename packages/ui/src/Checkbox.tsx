import { CheckIcon } from "lucide-react";
import { useId } from "react";

/**
 * Props for the shared checkbox component.
 */
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible checkbox component used across dashboard and frontend forms.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}: CheckboxProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 select-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors ${
          checked
            ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
            : "border-[var(--ds-border-strong)]"
        }`}
      >
        {checked && <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </span>
      {label && <span className="text-sm text-[var(--ds-text)]">{label}</span>}
    </label>
  );
}
