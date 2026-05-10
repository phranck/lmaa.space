import { useI18n } from "@/context/I18nContext.tsx";

interface Props {
  src: string | null;
  heightPx: string;
  isLoading?: boolean;
}

/**
 * Iframe-based footer preview that loads the real frontend preview route.
 */
export function FooterPreview({ src, heightPx, isLoading }: Props) {
  const { messages } = useI18n();
  const footerMessages = messages.content.footerBuilder;

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--ds-surface)]/60 z-10">
          <div className="size-5 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      )}
      {src === null ? (
        <div className="h-32 flex items-center justify-center text-xs text-[var(--ds-text-muted)]">
          {footerMessages.noPreviewLoaded}
        </div>
      ) : (
        <div
          className="w-full min-h-32 rounded-b-card overflow-hidden bg-transparent"
          style={{ height: heightPx }}
        >
          <iframe
            src={src}
            title={footerMessages.previewTitle}
            className="size-full border-none bg-transparent"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
