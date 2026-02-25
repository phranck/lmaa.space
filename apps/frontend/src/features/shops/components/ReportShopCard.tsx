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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
        {submitted ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-3">🙏</p>
            <h2 className="font-serif text-xl font-semibold text-stone-900 mb-2">
              Danke für deinen Hinweis!
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              Wir prüfen deine Meldung und handeln bei Bedarf.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
              Shop melden
            </h2>
            <p className="text-sm text-stone-500 mb-5">
              Du möchtest{" "}
              <span className="font-medium text-stone-700">{shopName}</span>{" "}
              melden? Beschreibe kurz, warum dieser Shop deiner Meinung nach nicht auf lmaa.space gehört.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="z. B. Shop verkauft keine fairen oder nachhaltigen Produkte, ist nicht mehr erreichbar, …"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
              />

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting || reason.trim().length < 10}
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
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
