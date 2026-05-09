import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  /** Visible label. */
  label: string;
  /** Click handler. The menu auto-closes after the handler runs. */
  onClick: () => void;
  /** Optional left-aligned icon. */
  icon?: React.ReactNode;
  /** Renders the item with destructive styling. */
  danger?: boolean;
  /** Disables the item. */
  disabled?: boolean;
}

/**
 * One menu entry: either a clickable item or a horizontal separator.
 */
export type ContextMenuEntry = ContextMenuItem | { separator: true };

interface ContextMenuProps {
  /** When non-null, the menu opens at the given viewport-coordinate origin. */
  origin: { x: number; y: number } | null;
  onClose: () => void;
  items: ContextMenuEntry[];
}

/**
 * Lightweight portal-rendered popup menu, intended for `onContextMenu`
 * triggers. The opener stores `{ x, y }` from `event.clientX/Y`; the menu
 * positions itself there and clamps to the viewport edges. Outside-click
 * and Escape close the menu; clicking an item runs its handler then closes.
 */
export function ContextMenu({ origin, onClose, items }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!origin || !ref.current) {
      setPosition(null);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const padding = 8;
    const left = Math.min(origin.x, window.innerWidth - rect.width - padding);
    const top = Math.min(origin.y, window.innerHeight - rect.height - padding);
    setPosition({ top: Math.max(padding, top), left: Math.max(padding, left) });
  }, [origin]);

  useEffect(() => {
    if (!origin) return;
    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [origin, onClose]);

  if (!origin) return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{
        position: "fixed",
        top: position?.top ?? origin.y,
        left: position?.left ?? origin.x,
        visibility: position ? "visible" : "hidden",
      }}
      className="z-[1000] min-w-[12rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] py-1 text-sm shadow-lg"
    >
      {items.map((entry, index) =>
        "separator" in entry ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: separators have no stable id, position-based key is fine
          <div key={`sep-${index}`} className="my-1 h-px bg-[var(--ds-border)]" />
        ) : (
          <button
            key={entry.label}
            type="button"
            disabled={entry.disabled}
            onClick={() => {
              entry.onClick();
              onClose();
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left disabled:opacity-50 disabled:pointer-events-none ${
              entry.danger
                ? "text-[var(--ds-btn-danger-text)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
                : "text-[var(--ds-text)] hover:bg-[var(--ds-nav-hover-bg)]"
            }`}
            role="menuitem"
          >
            {entry.icon && <span className="shrink-0 opacity-70">{entry.icon}</span>}
            <span className="truncate">{entry.label}</span>
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
