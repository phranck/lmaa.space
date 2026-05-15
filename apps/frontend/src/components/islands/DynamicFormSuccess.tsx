import { useMarkdownHtml } from "@/hooks/useMarkdownHtml";

interface SuccessScreenProps {
  onReset: () => void;
  headline?: string;
  message?: string;
}

/**
 * Full-page success confirmation shown after a form is submitted successfully.
 */
export function SuccessScreen({ onReset, headline, message }: SuccessScreenProps) {
  const messageRef = useMarkdownHtml(message);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="size-16 rounded-full bg-[var(--ds-accent-subtle)] flex items-center justify-center mx-auto mb-6">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--ds-accent)]"
          aria-hidden
        >
          <title>Erfolgreich gesendet</title>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="font-serif text-2xl font-semibold text-[var(--ds-text)] mb-3">
        {headline ?? "Vielen Dank!"}
      </h1>
      {message && (
        <div
          ref={messageRef}
          className="text-sm text-[var(--ds-text-muted)] prose prose-sm max-w-none"
        />
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
        <a
          href="/"
          className="inline-flex items-center justify-center h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
        >
          Zur Startseite
        </a>
        <button
          type="button"
          onClick={onReset}
          className="h-9 px-6 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
        >
          Weiteres Formular ausfüllen
        </button>
      </div>
      <p className="mt-10 text-sm text-[var(--ds-text-subtle)]">
        Dir gefällt lmaa.space?{" "}
        <a
          href="https://ko-fi.com/layeredwork?ref=lmaa.space"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ds-accent)] hover:underline"
        >
          Unterstütze das Projekt!
        </a>
      </p>
    </div>
  );
}
