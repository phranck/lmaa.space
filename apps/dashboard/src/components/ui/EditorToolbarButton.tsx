import type { ButtonHTMLAttributes, ReactNode } from "react";

import { DashboardButton } from "./DashboardButton.tsx";
import type { DashboardButtonVariant } from "./DashboardButton.tsx";

type EditorToolbarButtonVariant = Extract<
  DashboardButtonVariant,
  "primary" | "success" | "warning" | "danger" | "neutral" | "review"
>;

interface EditorToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: EditorToolbarButtonVariant;
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
    <DashboardButton
      className={className}
      leadingIcon={icon}
      size="action"
      type={type}
      variant={variant}
      {...props}
    >
      {children}
    </DashboardButton>
  );
}
