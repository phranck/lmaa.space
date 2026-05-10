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
    <div className="flex items-center rounded-control border border-[var(--ds-btn-primary-border)] overflow-hidden">
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
