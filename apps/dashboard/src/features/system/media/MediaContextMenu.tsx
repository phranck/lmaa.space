import {
  AppWindowIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  LinkIcon,
  PencilSimpleIcon,
  TabsIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import type { MediaAsset, MediaFolder, MediaFolderColor } from "@lmaa/shared";

import { DashboardMenu } from "@/components/ui/DashboardControls.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { canOpenInBrowser } from "@/features/system/media/media-utils.ts";
import { MediaContextMenuItem } from "@/features/system/media/MediaContextMenuItem.tsx";
import { MediaFolderColorPicker } from "@/features/system/media/MediaFolderColorPicker.tsx";

/**
 * Variant union: single-asset, multi-asset, folder, or empty-area context menu.
 * Forward-compatible: `"folder"` added in Spec B for folder items.
 */
export type MediaContextMenuVariant = "single" | "multi" | "empty" | "folder";

interface MediaContextMenuProps {
  open: boolean;
  origin: { x: number; y: number } | null;
  onClose: () => void;
  variant: MediaContextMenuVariant;
  asset: MediaAsset | null;
  folder: MediaFolder | null;
  selectedAssetCount: number;
  selectedFolderCount: number;
  folderItemCount: number;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onAddAssets: () => void;
  onCopyAddress: () => void;
  onCopyAsset: () => void;
  onDeleteAsset: () => void;
  onDeleteFolder: () => void;
  onDeleteSelection: () => void;
  onNewFolder: () => void;
  onNewFolderWithSelection: () => void;
  onOpenFolder: () => void;
  onOpenInNewTab: () => void;
  onOpenInNewWindow: () => void;
  onRenameAlias: () => void;
  onRenameDisplayName: () => void;
  onRenameFolder: () => void;
  onSaveAs: () => void;
  onSaveToDownloads: () => void;
  onSetFolderColor: (color: MediaFolderColor) => void;
}

const dividerClass = "my-1 h-px bg-[var(--ds-border)] border-0";
const iconClass = "size-3.5 text-[var(--ds-text-muted)]";

function hasShowSaveFilePicker(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

function hasImageClipboardSupport(asset: MediaAsset | null): boolean {
  return (
    asset?.kind === "image" &&
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}

/**
 * Finder-style right-click context menu for the media asset manager.
 *
 * Four variants drive the visible item set:
 * - `single`: actions for one asset.
 * - `multi`: actions for a multi-selection (assets and/or folders).
 * - `folder`: actions for a single folder item.
 * - `empty`: actions when no item is under the cursor (drop-zone area).
 *
 * `DashboardMenu` handles outside-click and Escape via `onOpenChange(false)`,
 * which is forwarded to `onClose` here.
 */
export function MediaContextMenu({
  open,
  origin,
  onClose,
  variant,
  asset,
  folder,
  selectedAssetCount,
  selectedFolderCount,
  folderItemCount,
  mediaMessages,
  onAddAssets,
  onCopyAddress,
  onCopyAsset,
  onDeleteAsset,
  onDeleteFolder,
  onDeleteSelection,
  onNewFolder,
  onNewFolderWithSelection,
  onOpenFolder,
  onOpenInNewTab,
  onOpenInNewWindow,
  onRenameAlias,
  onRenameDisplayName,
  onRenameFolder,
  onSaveAs,
  onSaveToDownloads,
  onSetFolderColor,
}: MediaContextMenuProps) {
  const t = mediaMessages.contextMenu;

  return (
    <DashboardMenu
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      origin={origin}
    >
      {variant === "single" && asset && (
        <>
          {canOpenInBrowser(asset) && (
            <>
              <MediaContextMenuItem
                icon={<TabsIcon weight="duotone" className={iconClass} />}
                label={t.openInNewTab}
                onClose={onClose}
                onSelect={onOpenInNewTab}
              />
              <MediaContextMenuItem
                icon={<AppWindowIcon weight="duotone" className={iconClass} />}
                label={t.openInNewWindow}
                onClose={onClose}
                onSelect={onOpenInNewWindow}
              />
              <hr className={dividerClass} />
            </>
          )}
          <MediaContextMenuItem
            icon={<DownloadSimpleIcon weight="duotone" className={iconClass} />}
            label={t.saveToDownloads}
            onClose={onClose}
            onSelect={onSaveToDownloads}
          />
          {hasShowSaveFilePicker() && (
            <MediaContextMenuItem
              icon={<DownloadSimpleIcon weight="duotone" className={iconClass} />}
              label={t.saveAs}
              onClose={onClose}
              onSelect={onSaveAs}
            />
          )}
          <hr className={dividerClass} />
          <MediaContextMenuItem
            icon={<LinkIcon weight="duotone" className={iconClass} />}
            label={t.copyAddress}
            onClose={onClose}
            onSelect={onCopyAddress}
          />
          {hasImageClipboardSupport(asset) && (
            <MediaContextMenuItem
              icon={<CopyIcon weight="duotone" className={iconClass} />}
              label={t.copyAsset}
              onClose={onClose}
              onSelect={onCopyAsset}
            />
          )}
          <MediaContextMenuItem
            icon={<PencilSimpleIcon weight="duotone" className={iconClass} />}
            label={t.renameAlias}
            onClose={onClose}
            onSelect={onRenameAlias}
          />
          <MediaContextMenuItem
            icon={<PencilSimpleIcon weight="duotone" className={iconClass} />}
            label={t.renameDisplayName}
            onClose={onClose}
            onSelect={onRenameDisplayName}
          />
          <hr className={dividerClass} />
          <MediaContextMenuItem
            destructive
            icon={<TrashIcon weight="duotone" className="size-3.5" />}
            label={t.deleteAsset}
            onClose={onClose}
            onSelect={onDeleteAsset}
          />
        </>
      )}

      {variant === "multi" && (
        <>
          <MediaContextMenuItem
            icon={<FolderPlusIcon weight="duotone" className={iconClass} />}
            label={t.newFolderWithSelection(selectedAssetCount + selectedFolderCount)}
            onClose={onClose}
            onSelect={onNewFolderWithSelection}
          />
          <hr className={dividerClass} />
          <MediaContextMenuItem
            destructive
            icon={<TrashIcon weight="duotone" className="size-3.5" />}
            label={t.deleteSelection}
            onClose={onClose}
            onSelect={onDeleteSelection}
          />
        </>
      )}

      {variant === "empty" && (
        <>
          <MediaContextMenuItem
            icon={<FolderPlusIcon weight="duotone" className={iconClass} />}
            label={t.newFolder}
            onClose={onClose}
            onSelect={onNewFolder}
          />
          <hr className={dividerClass} />
          <MediaContextMenuItem
            icon={<UploadSimpleIcon weight="duotone" className={iconClass} />}
            label={t.addAssets}
            onClose={onClose}
            onSelect={onAddAssets}
          />
        </>
      )}

      {variant === "folder" && folder && (
        <>
          <MediaContextMenuItem
            icon={<FolderOpenIcon weight="duotone" className={iconClass} />}
            label={t.openFolder}
            onClose={onClose}
            onSelect={onOpenFolder}
          />
          {!folder.isSystem && (
            <>
              <hr className={dividerClass} />
              <MediaContextMenuItem
                icon={<PencilSimpleIcon weight="duotone" className={iconClass} />}
                label={t.renameFolderInline}
                onClose={onClose}
                onSelect={onRenameFolder}
              />
            </>
          )}
          <hr className={dividerClass} />
          <MediaFolderColorPicker
            color={folder.color}
            label={t.folderColorLabel}
            labels={t.folderColorNames}
            menuItems
            onChange={onSetFolderColor}
            onClose={onClose}
          />
          {!folder.isSystem && (
            <>
              <hr className={dividerClass} />
              <MediaContextMenuItem
                destructive
                icon={<TrashIcon weight="duotone" className="size-3.5" />}
                label={
                  folderItemCount > 0 ? t.deleteFolderWithCount(folderItemCount) : t.deleteFolder
                }
                onClose={onClose}
                onSelect={onDeleteFolder}
              />
            </>
          )}
        </>
      )}
    </DashboardMenu>
  );
}
