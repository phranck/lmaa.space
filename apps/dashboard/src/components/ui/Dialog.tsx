import { useCallback, useEffect, useId, useRef } from "react";

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
      className={`bg-[var(--ds-surface-inset)] border-t border-[var(--ds-border)] px-6 py-4 ${className ?? "flex justify-end gap-3"}`}
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const firstFocusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      trapFocus(e);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose, trapFocus]);

  if (!open) return null;

  const maxWidthClass = maxWidth === "md" ? "max-w-md" : "max-w-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      {/* biome-ignore lint/a11y/useSemanticElements: custom dialog with animation, not native <dialog> */}
      <div
        role="dialog"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative bg-[var(--ds-surface)] rounded-2xl shadow-xl ${maxWidthClass} w-full overlay-card-enter`}
      >
        <div className="bg-[var(--ds-surface-inset)] px-6 pt-6 pb-3">
          <h3 id={titleId} className="font-bold text-[var(--ds-text)]">
            {title}
          </h3>
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
  "h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-60";

export const dialogBtnSecondary =
  "h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors";

export const dialogBtnDestructive =
  "h-9 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors disabled:opacity-60";
