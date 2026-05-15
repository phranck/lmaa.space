import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { cx } from "./classNames.ts";

export type ButtonPrimitiveVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "filled"
  | "accent"
  | "ghost";

export type ButtonPrimitiveSize = "action" | "control" | "large";

export interface ButtonPrimitiveProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonPrimitiveVariant;
  size?: ButtonPrimitiveSize;
  leadingIcon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  trailingIcon?: ReactNode;
}

type IconButtonPrimitiveAccessibleName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-label"?: string; "aria-labelledby": string };

export type IconButtonPrimitiveProps = Omit<ComponentPropsWithoutRef<"button">, "children"> &
  IconButtonPrimitiveAccessibleName & {
    children: ReactNode;
    ref?: Ref<HTMLButtonElement>;
    variant?: ButtonPrimitiveVariant;
    size?: ButtonPrimitiveSize;
  };

const buttonBaseClass =
  "inline-flex shrink-0 items-center justify-center rounded-control border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-[var(--ds-control-disabled-opacity)]";

const buttonVariantClass: Record<ButtonPrimitiveVariant, string> = {
  neutral:
    "border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]",
  primary:
    "border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]",
  success:
    "border-[var(--ds-btn-success-border)] text-[var(--ds-btn-success-text)] hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)]",
  warning:
    "border-[var(--ds-btn-warning-border)] text-[var(--ds-btn-warning-text)] hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)]",
  danger:
    "border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]",
  filled:
    "border-transparent bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] hover:bg-[var(--ds-btn-filled-hover)]",
  accent:
    "border-transparent bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] hover:bg-[var(--ds-btn-primary-hover)]",
  ghost:
    "border-transparent text-[var(--ds-text-muted)] hover:bg-[var(--ds-control-hover-bg)] hover:text-[var(--ds-text)]",
};

const buttonSizeClass: Record<ButtonPrimitiveSize, string> = {
  action: "h-[var(--ds-control-h-action)] gap-1.5 px-3 text-xs",
  control: "h-[var(--ds-control-h-field)] gap-2 px-3 text-sm",
  large: "h-[var(--ds-control-h-field-large)] gap-2 px-4 text-sm",
};

const iconButtonSizeClass: Record<ButtonPrimitiveSize, string> = {
  action: "size-[var(--ds-control-h-icon)] text-xs",
  control: "size-[var(--ds-control-h-field)] text-sm",
  large: "size-[var(--ds-control-h-field-large)] text-sm",
};

export function ButtonPrimitive({
  children,
  className,
  leadingIcon,
  ref,
  size = "action",
  trailingIcon,
  type = "button",
  variant = "neutral",
  ...buttonProps
}: ButtonPrimitiveProps) {
  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={cx(buttonBaseClass, buttonSizeClass[size], buttonVariantClass[variant], className)}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export function IconButtonPrimitive({
  children,
  className,
  ref,
  size = "action",
  type = "button",
  variant = "ghost",
  ...buttonProps
}: IconButtonPrimitiveProps) {
  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={cx(
        buttonBaseClass,
        iconButtonSizeClass[size],
        buttonVariantClass[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
