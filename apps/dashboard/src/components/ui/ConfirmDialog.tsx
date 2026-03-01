import { useI18n } from "@/context/I18nContext.tsx";
import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation dialog used for destructive/admin actions.
 *
 * @param props - Dialog state, copy and action callbacks.
 * @returns Modal dialog element.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const resolvedConfirmLabel = confirmLabel ?? common.delete;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-[var(--ds-surface)] rounded-2xl shadow-xl max-w-sm w-full overlay-card-enter">
        <div className="px-6 pt-6 pb-3">
          <h3 className="font-bold text-[var(--ds-text)]">{title}</h3>
        </div>
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">{description}</p>
        </div>
        <div className="border-t border-[var(--ds-border)] px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="h-9 px-4 bg-red-500 text-white rounded-control text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isPending ? "…" : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
