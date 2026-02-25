import { useEffect } from "react";

interface DeadLinkConfirmCardProps {
  shopName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeadLinkConfirmCard({ shopName, onConfirm, onClose }: DeadLinkConfirmCardProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ds-overlay-bg)] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--ds-surface)] rounded-[var(--ds-radius-3xl)] shadow-[var(--ds-shadow-xl)] w-full max-w-md p-6">
        <h2 className="font-serif text-xl font-semibold text-[var(--ds-text)] mb-1">
          Link defekt?
        </h2>
        <p className="text-sm text-[var(--ds-text-muted)] mb-6">
          Ist der Link von{" "}
          <span className="font-medium text-[var(--ds-text)]">{shopName}</span>{" "}
          wirklich nicht mehr erreichbar?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 px-5 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
          >
            Ja, Link melden
          </button>
        </div>
      </div>
    </div>
  );
}
