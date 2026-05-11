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
    <div className="flex h-[var(--ds-control-h-field)] shrink-0 items-center overflow-hidden rounded-control border border-[var(--ds-btn-primary-border)]">
      {children}
      <ExportActionButton
        className="h-full rounded-none border-0"
        disabled={disabled}
        label={label}
        onClick={onClick}
        size="control"
        title={tooltip}
      />
    </div>
  );
}
