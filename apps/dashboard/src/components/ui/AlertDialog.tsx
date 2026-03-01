import { useI18n } from "@/context/I18nContext.tsx";
import { useEffect } from "react";

interface AlertDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  closeLabel?: string;
  onClose: () => void;
}

/**
 * Generic single-button alert dialog for info and error messages.
 *
 * @param props - Dialog state, copy and close callback.
 * @returns Modal dialog element.
 */
export function AlertDialog({
  open,
  title,
  description,
  closeLabel,
  onClose,
}: AlertDialogProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const resolvedCloseLabel = closeLabel ?? common.close;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label={resolvedCloseLabel}
      />
      <div className="relative bg-[var(--ds-surface)] rounded-2xl shadow-xl max-w-sm w-full overlay-card-enter">
        <div className="px-6 pt-6 pb-3">
          <h3 className="font-bold text-[var(--ds-text)]">{title}</h3>
        </div>
        {description && (
          <div className="px-6 py-3">
            <p className="text-sm text-[var(--ds-text-muted)]">{description}</p>
          </div>
        )}
        <div className="px-6 pt-3 pb-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
          >
            {resolvedCloseLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
