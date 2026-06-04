import { ArrowsClockwiseIcon, PlusCircleIcon } from "@phosphor-icons/react";

import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";

export type MediaUploadPhase = "reading" | "uploading" | "processing";

export interface MediaUploadProgress {
  filesUploaded?: number;
  phase: MediaUploadPhase;
  name: string;
  filesRead?: number;
  filesTotal?: number;
  bytesLoaded?: number;
  bytesTotal?: number;
  percent?: number | null;
}

interface MediaUploadOverlayProps {
  detail: string;
  show: boolean;
  title: string;
  uploadProgress: MediaUploadProgress | null;
  uploadProgressValue: number | null;
}

export function MediaUploadOverlay({
  detail,
  show,
  title,
  uploadProgress,
  uploadProgressValue,
}: MediaUploadOverlayProps) {
  return (
    <Dialog
      open={show}
      title={title}
      titleIcon={
        uploadProgress ? (
          <ArrowsClockwiseIcon
            weight="duotone"
            className={`${dialogHeaderIconClass} animate-spin text-[var(--color-primary)]`}
          />
        ) : (
          <PlusCircleIcon
            weight="duotone"
            className={`${dialogHeaderIconClass} text-[var(--color-primary)]`}
          />
        )
      }
      onClose={() => {}}
    >
      <div className="space-y-4 px-6 py-3" aria-live="polite">
        {uploadProgress?.name ? (
          <p className="text-sm font-medium text-[var(--ds-text)]">{uploadProgress.name}</p>
        ) : null}
        <p className="text-[var(--ds-text-muted)]">{detail}</p>
        {uploadProgress && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ds-bg-elevated)]">
            <div
              className={`h-full rounded-full bg-[var(--color-primary)] transition-all ${
                uploadProgressValue === null ? "w-1/3 animate-pulse" : ""
              }`}
              style={
                uploadProgressValue !== null
                  ? { width: `${Math.min(100, Math.max(0, uploadProgressValue))}%` }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
