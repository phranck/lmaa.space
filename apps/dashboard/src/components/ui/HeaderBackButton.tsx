import { CaretLeftIcon } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes } from "react";

interface HeaderBackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function HeaderBackButton({
  className,
  label,
  type = "button",
  ...props
}: HeaderBackButtonProps) {
  return (
    <button
      type={type}
      className={[
        "flex items-center gap-1.5 text-sm font-medium text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <CaretLeftIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
