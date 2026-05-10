import { CheckIcon, MinusIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

import { cx } from "./classNames";

export type SwitchPrimitiveSize = "sm" | "md";

export interface SwitchPrimitiveProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: SwitchPrimitiveSize;
}

const switchTrackSizeClass: Record<SwitchPrimitiveSize, string> = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
};

const switchThumbSizeClass: Record<SwitchPrimitiveSize, string> = {
  sm: "size-4",
  md: "size-5",
};

const switchThumbTranslateClass: Record<SwitchPrimitiveSize, string> = {
  sm: "translate-x-4",
  md: "translate-x-5",
};

export function SwitchPrimitive({
  checked,
  className,
  disabled,
  onCheckedChange,
  onClick,
  size = "sm",
  type = "button",
  ...buttonProps
}: SwitchPrimitiveProps) {
  return (
    <button
      {...buttonProps}
      aria-checked={checked}
      className={cx(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)] focus:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-[var(--ds-control-disabled-opacity)]",
        switchTrackSizeClass[size],
        checked
          ? "bg-[var(--color-primary)]"
          : "bg-[var(--ds-border-strong)]",
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) {
          return;
        }
        onCheckedChange(!checked);
      }}
      role="switch"
      type={type}
    >
      <span
        className={cx(
          "pointer-events-none inline-block rounded-full bg-white shadow transition-transform",
          switchThumbSizeClass[size],
          checked ? switchThumbTranslateClass[size] : "translate-x-0",
        )}
      />
    </button>
  );
}

export type CheckboxPrimitiveSize = "sm" | "md";

export interface CheckboxPrimitiveProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "size" | "type"> {
  boxClassName?: string;
  checked: boolean;
  description?: ReactNode;
  indeterminate?: boolean;
  label?: ReactNode;
  onCheckedChange: (checked: boolean) => void;
  size?: CheckboxPrimitiveSize;
}

const checkboxBoxSizeClass: Record<CheckboxPrimitiveSize, string> = {
  sm: "size-4",
  md: "size-5",
};

const checkboxIconSizeClass: Record<CheckboxPrimitiveSize, string> = {
  sm: "size-2.5",
  md: "size-3",
};

export function CheckboxPrimitive({
  boxClassName,
  checked,
  className,
  description,
  disabled = false,
  id,
  indeterminate = false,
  label,
  onCheckedChange,
  size = "sm",
  ...inputProps
}: CheckboxPrimitiveProps) {
  const generatedId = useId();
  const resolvedId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={cx(
        "flex items-start gap-3 select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
      htmlFor={resolvedId}
    >
      <input
        {...inputProps}
        checked={checked}
        className="sr-only"
        disabled={disabled}
        id={resolvedId}
        onChange={(event) => onCheckedChange(event.target.checked)}
        ref={inputRef}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className={cx(
          "mt-0.5 flex shrink-0 items-center justify-center rounded border transition-colors",
          checkboxBoxSizeClass[size],
          checked || indeterminate
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--ds-border-strong)] bg-[var(--ds-form-control-bg,var(--ds-input-bg))]",
          boxClassName,
        )}
      >
        {indeterminate ? (
          <MinusIcon className={checkboxIconSizeClass[size]} strokeWidth={3} />
        ) : (
          checked && (
            <CheckIcon className={checkboxIconSizeClass[size]} strokeWidth={3} />
          )
        )}
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm text-[var(--ds-text)]">{label}</span>}
          {description && (
            <span className="block text-xs text-[var(--ds-text-muted)]">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
