import { useRef } from "react";

import { ImportActionButton } from "./DashboardActionButton.tsx";

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
      <ImportActionButton
        disabled={disabled}
        label={label}
        onClick={() => fileInputRef.current?.click()}
        size="control"
        title={tooltip}
      />
      <input
        aria-label={label}
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
