import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "neutral" | "danger" | "warning" | "success" | "primary";

const variantClasses: Record<Variant, string> = {
  neutral:
    "border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]",
  danger:
    "border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]",
  warning:
    "border-[var(--ds-btn-warning-border)] text-[var(--ds-btn-warning-text)] hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)]",
  success:
    "border-[var(--ds-btn-success-border)] text-[var(--ds-btn-success-text)] hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)]",
  primary:
    "border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]",
};

interface TableActionButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: Variant;
  icon?: ReactNode;
  label?: string;
}

export function TableActionButton({
  variant = "neutral",
  icon,
  label,
  className,
  children,
  ...rest
}: TableActionButtonProps) {
  return (
    <button
      type="button"
      className={`h-9 px-3 flex items-center gap-2 border rounded-control text-sm disabled:opacity-50 ${variantClasses[variant]}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {icon}
      {label}
      {children}
    </button>
  );
}
