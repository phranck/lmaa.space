import { CaretLeftIcon } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes } from "react";

import { DashboardButton } from "./DashboardButton.tsx";

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
    <DashboardButton
      className={className}
      leadingIcon={<CaretLeftIcon weight="duotone" className="size-3.5 shrink-0" />}
      size="action"
      type={type}
      variant="ghost"
      {...props}
    >
      <span>{label}</span>
    </DashboardButton>
  );
}
