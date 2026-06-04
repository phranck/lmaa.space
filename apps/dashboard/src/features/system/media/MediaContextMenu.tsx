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

import { SubMenu } from "@/components/ui/SubMenu.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { canOpenInBrowser } from "@/features/system/media/media-utils.ts";
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
 * `SubMenu` handles outside-click and Escape via `onOpenChange(false)`,
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
    <SubMenu
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
              <SubMenu.Item
                icon={<TabsIcon weight="duotone" className={iconClass} />}
                onSelect={onOpenInNewTab}
              >
                {t.openInNewTab}
              </SubMenu.Item>
              <SubMenu.Item
                icon={<AppWindowIcon weight="duotone" className={iconClass} />}
                onSelect={onOpenInNewWindow}
              >
                {t.openInNewWindow}
              </SubMenu.Item>
              <SubMenu.Item separator />
            </>
          )}
          <SubMenu.Item
            icon={<DownloadSimpleIcon weight="duotone" className={iconClass} />}
            onSelect={onSaveToDownloads}
          >
            {t.saveToDownloads}
          </SubMenu.Item>
          {hasShowSaveFilePicker() && (
            <SubMenu.Item
              icon={<DownloadSimpleIcon weight="duotone" className={iconClass} />}
              onSelect={onSaveAs}
            >
              {t.saveAs}
            </SubMenu.Item>
          )}
          <SubMenu.Item separator />
          <SubMenu.Item
            icon={<LinkIcon weight="duotone" className={iconClass} />}
            onSelect={onCopyAddress}
          >
            {t.copyAddress}
          </SubMenu.Item>
          {hasImageClipboardSupport(asset) && (
            <SubMenu.Item
              icon={<CopyIcon weight="duotone" className={iconClass} />}
              onSelect={onCopyAsset}
            >
              {t.copyAsset}
            </SubMenu.Item>
          )}
          <SubMenu.Item
            icon={<PencilSimpleIcon weight="duotone" className={iconClass} />}
            onSelect={onRenameAlias}
          >
            {t.renameAlias}
          </SubMenu.Item>
          <SubMenu.Item
            icon={<PencilSimpleIcon weight="duotone" className={iconClass} />}
            onSelect={onRenameDisplayName}
          >
            {t.renameDisplayName}
          </SubMenu.Item>
          <SubMenu.Item separator />
          <SubMenu.Item
            icon={<TrashIcon weight="duotone" className="size-3.5" />}
            onSelect={onDeleteAsset}
            variant="danger"
          >
            {t.deleteAsset}
          </SubMenu.Item>
        </>
      )}

      {variant === "multi" && (
        <>
          <SubMenu.Item
            icon={<FolderPlusIcon weight="duotone" className={iconClass} />}
            onSelect={onNewFolderWithSelection}
          >
            {t.newFolderWithSelection(selectedAssetCount + selectedFolderCount)}
          </SubMenu.Item>
          <SubMenu.Item separator />
          <SubMenu.Item
            icon={<TrashIcon weight="duotone" className="size-3.5" />}
            onSelect={onDeleteSelection}
            variant="danger"
          >
            {t.deleteSelection}
          </SubMenu.Item>
        </>
      )}

      {variant === "empty" && (
        <>
          <SubMenu.Item
            icon={<FolderPlusIcon weight="duotone" className={iconClass} />}
            onSelect={onNewFolder}
          >
            {t.newFolder}
          </SubMenu.Item>
          <SubMenu.Item separator />
          <SubMenu.Item
            icon={<UploadSimpleIcon weight="duotone" className={iconClass} />}
            onSelect={onAddAssets}
          >
            {t.addAssets}
          </SubMenu.Item>
        </>
      )}

      {variant === "folder" && folder && (
        <>
          <SubMenu.Item
            icon={<FolderOpenIcon weight="duotone" className={iconClass} />}
            onSelect={onOpenFolder}
          >
            {t.openFolder}
          </SubMenu.Item>
          {!folder.isSystem && (
            <>
              <SubMenu.Item separator />
              <SubMenu.Item
                icon={<PencilSimpleIcon weight="duotone" className={iconClass} />}
                onSelect={onRenameFolder}
              >
                {t.renameFolderInline}
              </SubMenu.Item>
            </>
          )}
          <SubMenu.Item separator />
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
              <SubMenu.Item separator />
              <SubMenu.Item
                icon={<TrashIcon weight="duotone" className="size-3.5" />}
                onSelect={onDeleteFolder}
                variant="danger"
              >
                {folderItemCount > 0 ? t.deleteFolderWithCount(folderItemCount) : t.deleteFolder}
              </SubMenu.Item>
            </>
          )}
        </>
      )}
    </SubMenu>
  );
}
