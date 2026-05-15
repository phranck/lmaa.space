import { ArrowsClockwiseIcon, PlusCircleIcon } from "@phosphor-icons/react";

export type MediaUploadPhase = "reading" | "uploading" | "processing";

export interface MediaUploadProgress {
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
  uploadHint: string;
  uploadProgress: MediaUploadProgress | null;
  uploadProgressValue: number | null;
}

export function MediaUploadOverlay({
  detail,
  show,
  title,
  uploadHint,
  uploadProgress,
  uploadProgressValue,
}: MediaUploadOverlayProps) {
  return (
    <div
      aria-hidden={!show}
      aria-live="polite"
      className={`pointer-events-none absolute inset-[3px] z-10 flex items-center justify-center rounded-[calc(1.25rem-3px)] border-2 border-dashed transition-all ${
        show
          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] opacity-100"
          : "border-transparent bg-transparent opacity-0"
      }`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]/95 px-6 py-5 text-center shadow-lg backdrop-blur-sm">
        {uploadProgress ? (
          <ArrowsClockwiseIcon
            weight="duotone"
            className="mx-auto mb-3 size-8 animate-spin text-[var(--color-primary)]"
          />
        ) : (
          <PlusCircleIcon
            weight="duotone"
            className="mx-auto mb-3 size-8 text-[var(--color-primary)]"
          />
        )}
        <p className="text-sm font-medium text-[var(--ds-text)]">{title}</p>
        <p className="mt-1 truncate text-xs text-[var(--ds-text-muted)]">
          {uploadProgress?.name ?? uploadHint}
        </p>
        <p className="mt-1 text-xs text-[var(--ds-text-subtle)]">{detail}</p>
        {uploadProgress && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ds-bg-elevated)]">
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
    </div>
  );
}
