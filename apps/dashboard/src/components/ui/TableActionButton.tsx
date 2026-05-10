import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { DashboardButton } from "./DashboardButton.tsx";
import type { DashboardButtonVariant } from "./DashboardButton.tsx";

type Variant = Extract<
  DashboardButtonVariant,
  "neutral" | "danger" | "warning" | "success" | "primary"
>;

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
    <DashboardButton
      className={className}
      leadingIcon={icon}
      size="action"
      variant={variant}
      {...rest}
    >
      {label}
      {children}
    </DashboardButton>
  );
}
