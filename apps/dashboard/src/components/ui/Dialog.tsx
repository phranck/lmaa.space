import { OverlayCard } from "./OverlayCard.tsx";

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
 * - Closes on ESC key (via OverlayCard's overlay-stack).
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
  const size = maxWidth === "md" ? "fixed-md" : "fixed-sm";

  return (
    <OverlayCard open={open} onClose={onClose} size={size} aria-label={title}>
      <div className="bg-[var(--ds-surface-inset)] px-6 pt-6 pb-3">
        <h3 className="font-bold text-[var(--ds-text)]">{title}</h3>
      </div>
      {children}
    </OverlayCard>
  );
}

Dialog.Footer = DialogFooter;

// ---------------------------------------------------------------------------
// Button style constants -- use these inside Dialog.Footer for consistency.
// ---------------------------------------------------------------------------

export const dialogBtnPrimary =
  "h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-60";

export const dialogBtnSecondary =
  "h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors";

export const dialogBtnDestructive =
  "h-9 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors disabled:opacity-60";
