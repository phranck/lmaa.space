import { useEffect } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "sm" | "md";
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={`border-t border-[var(--ds-border)] px-6 py-4 ${className ?? "flex justify-end gap-3"}`}
    >
      {children}
    </div>
  );
}

/**
 * Base modal dialog component.
 *
 * - Closes on ESC key.
 * - Backdrop click does NOT close the dialog.
 * - Always renders a header with `title` and slots children below.
 * - Use `Dialog.Footer` for the action button row.
 *
 * @param props.open      - Whether the dialog is visible.
 * @param props.title     - Heading shown in the dialog header.
 * @param props.onClose   - Called when ESC is pressed.
 * @param props.children  - Body content and `Dialog.Footer`.
 * @param props.maxWidth  - `"sm"` (default) or `"md"`.
 */
export function Dialog({ open, title, onClose, children, maxWidth = "sm" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClass = maxWidth === "md" ? "max-w-md" : "max-w-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative bg-[var(--ds-surface)] rounded-2xl shadow-xl ${maxWidthClass} w-full overlay-card-enter`}
      >
        <div className="px-6 pt-6 pb-3">
          <h3 className="font-bold text-[var(--ds-text)]">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

Dialog.Footer = DialogFooter;

// ---------------------------------------------------------------------------
// Button style constants — use these inside Dialog.Footer for consistency.
// ---------------------------------------------------------------------------

export const dialogBtnPrimary =
  "h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors disabled:opacity-60";

export const dialogBtnSecondary =
  "h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors";

export const dialogBtnDestructive =
  "h-9 px-4 bg-red-500 text-white rounded-control text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60";
