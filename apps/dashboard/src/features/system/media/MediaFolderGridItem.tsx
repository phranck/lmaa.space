import { FolderIcon } from "@phosphor-icons/react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

import type { MediaFolder } from "@lmaa/shared";
import { formHelpClass as fieldHelpClass } from "@lmaa/ui/form-primitives";

import { useI18n } from "@/context/I18nContext.tsx";
import { resolveMediaFolderColor } from "@/features/system/media/MediaFolderColors.ts";
import {
  mediaGridItemInsetClass,
  mediaGridItemOuterRadiusClass,
  mediaGridItemPreviewRadiusClass,
} from "@/features/system/media/MediaGridItem.tsx";

/**
 * Props for {@link MediaFolderGridItem}.
 *
 * @property folder - Folder data shown in the tile.
 * @property selected - Whether the tile is currently selected; drives the
 *   primary-coloured preview border and label colour.
 * @property itemCount - Number of direct children (folders + assets) shown
 *   as the caption row.
 * @property showText - When false the label and caption are hidden, leaving
 *   only the silhouette square.
 * @property onSelect - Fired on single click / Space; receives the original
 *   event so callers can read modifier keys for range/additive selection.
 * @property onOpen - Fired on double click / Enter; navigates into the folder.
 * @property onContextMenu - Fired on right-click; receives the folder id so
 *   the page-level menu can position itself.
 */
interface MediaFolderGridItemProps {
  folder: MediaFolder;
  selected: boolean;
  itemCount: number;
  showText?: boolean;
  onSelect: (
    id: number,
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) => void;
  onOpen: (id: number) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLElement>, folderId: number) => void;
}

/**
 * Folder tile rendered as the folder silhouette itself.
 *
 * The Phosphor FolderIcon (duotone) fills the entire aspect-square preview
 * area. Selection mirrors file tiles with a preview border so the folder
 * colour remains stable.
 */
export function MediaFolderGridItem({
  folder,
  selected,
  itemCount,
  showText = true,
  onSelect,
  onOpen,
  onContextMenu,
}: MediaFolderGridItemProps) {
  const { messages } = useI18n();
  const itemsLabel = messages.media.folders.itemsCount(itemCount);
  const folderColor = resolveMediaFolderColor(folder.color);

  function selectFolder(event: ReactMouseEvent<HTMLButtonElement>) {
    onSelect(folder.id, event);
  }

  function handleDoubleClick() {
    onOpen(folder.id);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(folder.id);
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      onSelect(folder.id, event);
    }
  }

  return (
    <div className={`group relative ${mediaGridItemOuterRadiusClass}`}>
      <button
        type="button"
        data-media-folder-item
        data-media-folder-id={folder.id}
        aria-pressed={selected}
        onClick={selectFolder}
        onContextMenu={onContextMenu ? (event) => onContextMenu(event, folder.id) : undefined}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        title={folder.name}
        className={`flex w-full flex-col items-center gap-1.5 ${mediaGridItemOuterRadiusClass} text-center transition-colors select-none focus:outline-none cursor-pointer`}
      >
        <div
          className={`w-full aspect-square ${mediaGridItemInsetClass} ${mediaGridItemOuterRadiusClass} border-2 transition-colors ${
            selected
              ? "border-[var(--color-primary)]"
              : "border-transparent group-hover:border-[var(--ds-border)] group-focus-within:border-[var(--color-primary)]"
          }`}
        >
          <FolderIcon
            weight="duotone"
            className={`size-full ${mediaGridItemPreviewRadiusClass} transition-colors`}
            style={{ color: folderColor }}
            aria-hidden
          />
        </div>
        {showText && (
          <div className="w-full px-0.5">
            <p
              className={`text-xs font-medium [overflow-wrap:anywhere] ${
                selected ? "text-[var(--color-primary)]" : "text-[var(--ds-text)]"
              }`}
            >
              {folder.name}
            </p>
            <span
              className={`${fieldHelpClass} block [overflow-wrap:anywhere] text-[10px] text-[var(--ds-text-muted)]`}
            >
              {itemsLabel}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
