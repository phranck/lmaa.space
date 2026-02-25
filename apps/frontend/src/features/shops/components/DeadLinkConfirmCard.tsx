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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
          Link defekt?
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          Ist der Link von{" "}
          <span className="font-medium text-stone-700">{shopName}</span>{" "}
          wirklich nicht mehr erreichbar?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            Ja, Link melden
          </button>
        </div>
      </div>
    </div>
  );
}
