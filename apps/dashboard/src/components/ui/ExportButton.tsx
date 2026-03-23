import { DownloadSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

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
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 h-9 px-3 text-sm text-[var(--ds-btn-primary-text)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title={tooltip}
      >
        <DownloadSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
        {label}
      </button>
    </div>
  );
}
