import { CheckIcon } from "lucide-react";
import { useId } from "react";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

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
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors ${
          checked
            ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
            : "border-[var(--ds-border-strong)]"
        }`}
      >
        {checked && <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </button>
      {label && <span className="text-sm text-[var(--ds-text)]">{label}</span>}
    </label>
  );
}
