import type { ButtonHTMLAttributes, ReactNode } from "react";

type EditorToolbarButtonVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "review";

interface EditorToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: EditorToolbarButtonVariant;
}

const VARIANT_CLASS_NAMES: Record<EditorToolbarButtonVariant, string> = {
  primary:
    "border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]",
  success:
    "border-[var(--ds-btn-success-border)] text-[var(--ds-btn-success-text)] hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)]",
  warning:
    "border-[var(--ds-btn-warning-border)] text-[var(--ds-btn-warning-text)] hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)]",
  danger:
    "border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]",
  neutral:
    "border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)]",
  review:
    "border-[var(--ds-badge-review-text)]/30 text-[var(--ds-badge-review-text)] hover:border-[var(--ds-badge-review-text)]/50 hover:bg-[var(--ds-badge-review-bg)]",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function EditorToolbarButton({
  children,
  className,
  icon,
  type = "button",
  variant = "neutral",
  ...props
}: EditorToolbarButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "flex h-8 items-center gap-2 rounded-control border px-4 text-sm font-medium transition-colors disabled:opacity-60",
        VARIANT_CLASS_NAMES[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
