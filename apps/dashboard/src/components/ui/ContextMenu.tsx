import type { ReactNode } from "react";

import {
  DashboardMenu,
  DashboardMenuItem,
} from "@/components/ui/DashboardControls.tsx";

export interface ContextMenuItem {
  /** Visible label. */
  label: string;
  /** Click handler. The menu auto-closes after the handler runs. */
  onClick: () => void;
  /** Optional left-aligned icon. */
  icon?: ReactNode;
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
  return (
    <DashboardMenu
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={origin !== null}
      origin={origin}
    >
      {items.map((entry, index) =>
        "separator" in entry ? (
          <div
            className="my-1 h-px bg-[var(--ds-border)]"
            key={getContextMenuEntryKey(entry, items, index)}
            role="separator"
          />
        ) : (
          <DashboardMenuItem
            disabled={entry.disabled}
            key={entry.label}
            leadingIcon={entry.icon}
            onSelect={entry.onClick}
            variant={entry.danger ? "danger" : "default"}
          >
            {entry.label}
          </DashboardMenuItem>
        ),
      )}
    </DashboardMenu>
  );
}

function getContextMenuEntryKey(
  entry: ContextMenuEntry,
  entries: readonly ContextMenuEntry[],
  index: number,
) {
  if (!("separator" in entry)) {
    return `item-${entry.label}`;
  }

  const previousLabel = getContextMenuItemLabel(entries[index - 1]);
  const nextLabel = getContextMenuItemLabel(entries[index + 1]);
  return `separator-${previousLabel}-${nextLabel}`;
}

function getContextMenuItemLabel(entry: ContextMenuEntry | undefined) {
  if (!entry || "separator" in entry) {
    return "edge";
  }
  return entry.label;
}
