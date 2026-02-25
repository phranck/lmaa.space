import { api } from "@/lib/api.ts";
import { useEffect, useRef, useState } from "react";

interface ReportShopCardProps {
  shopId: number;
  shopName: string;
  onClose: () => void;
}

export function ReportShopCard({ shopId, shopName, onClose }: ReportShopCardProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/shops/${shopId}/concern`, { reason });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Absenden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ds-overlay-bg)] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--ds-surface)] rounded-[var(--ds-radius-3xl)] shadow-[var(--ds-shadow-xl)] w-full max-w-md p-6">
        {submitted ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-3">🙏</p>
            <h2 className="font-serif text-xl font-semibold text-[var(--ds-text)] mb-2">
              Danke für deinen Hinweis!
            </h2>
            <p className="text-sm text-[var(--ds-text-muted)] mb-6">
              Wir prüfen deine Meldung und handeln bei Bedarf.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl font-semibold text-[var(--ds-text)] mb-1">
              Shop melden
            </h2>
            <p className="text-sm text-[var(--ds-text-muted)] mb-5">
              Du möchtest{" "}
              <span className="font-medium text-[var(--ds-text)]">{shopName}</span>{" "}
              melden? Beschreibe kurz, warum dieser Shop deiner Meinung nach nicht auf lmaa.space gehört.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="z. B. Shop verkauft keine fairen oder nachhaltigen Produkte, ist nicht mehr erreichbar, …"
                className="w-full px-3 py-2.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              />

              {error && <p className="text-[var(--ds-danger-text)] text-xs">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting || reason.trim().length < 10}
                  className="h-9 px-5 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Wird gesendet…" : "Melden"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
