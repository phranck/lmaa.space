import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useRef } from "react";

interface ImportButtonProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  tooltip: string;
  label: string;
  accept?: string;
}

export function ImportButton({
  onFileSelected,
  disabled,
  tooltip,
  label,
  accept = ".json",
}: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors disabled:opacity-50"
        title={tooltip}
      >
        <DownloadSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
        {label}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
