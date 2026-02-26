import { useI18n } from "@/context/I18nContext.tsx";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
        aria-label={common.cancel}
      />
      <div className="relative bg-[var(--ds-surface)] rounded-2xl shadow-xl p-6 max-w-sm w-full overlay-card-enter">
        <h3 className="font-bold text-[var(--ds-text)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--ds-text-muted)] mb-5">{description}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-control text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isPending ? "..." : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
