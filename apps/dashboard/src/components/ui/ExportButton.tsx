import type { ReactNode } from "react";

import { ExportActionButton } from "./DashboardActionButton.tsx";

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
  label: string;
  children?: ReactNode;
}

export function ExportButton({ onClick, disabled, tooltip, label, children }: ExportButtonProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-control border border-[var(--ds-border)]">
      {children}
      <ExportActionButton
        className="rounded-none border-0"
        disabled={disabled}
        label={label}
        onClick={onClick}
        title={tooltip}
      />
    </div>
  );
}
