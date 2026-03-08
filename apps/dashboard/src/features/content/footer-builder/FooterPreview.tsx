import { useEffect, useRef } from "react";

interface Props {
  html: string | null;
  isLoading?: boolean;
}

/**
 * Iframe-based live preview for the footer configuration.
 * Renders the HTML returned by the backend preview endpoint.
 */
export function FooterPreview({ html, isLoading }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || html === null) return;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    const height = doc.body?.scrollHeight;
    if (height) iframe.style.height = `${height}px`;
  }, [html]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--ds-surface)]/60 z-10">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
      )}
      {html === null ? (
        <div className="h-32 flex items-center justify-center text-xs text-[var(--ds-text-muted)]">
          Noch keine Vorschau — Spalte hinzufügen und speichern.
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          title="Footer Vorschau"
          className="w-full border-none rounded-b-card"
          sandbox="allow-same-origin"
        />
      )}
    </div>
  );
}
