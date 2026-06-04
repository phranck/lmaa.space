import { FileIcon, ImageIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useRef,
} from "react";

import type { MediaAsset, MediaFolder, MediaFolderColor } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageSplitAside } from "@/components/ui/PageLayout.tsx";
import { PageSplitLayout } from "@/components/ui/PageLayout.tsx";
import { PageSplitMain } from "@/components/ui/PageLayout.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { MediaDetailSidebar } from "@/features/system/media/MediaDetailSidebar.tsx";
import { MediaFolderGridItem } from "@/features/system/media/MediaFolderGridItem.tsx";
import { MediaFolderSidebar } from "@/features/system/media/MediaFolderSidebar.tsx";
import {
  MediaGridItem,
  mediaGridItemInsetClass,
  mediaGridItemOuterRadiusClass,
  mediaGridItemPreviewRadiusClass,
} from "@/features/system/media/MediaGridItem.tsx";
import type { MediaLinkedContentUsage } from "@/features/system/media/MediaLinkedContentSection.tsx";
import { MediaSelectionSidebar } from "@/features/system/media/MediaSelectionSidebar.tsx";
import type { SelectionBox } from "@/features/system/media/useMediaSelection.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";
import { useGridKeyboardNavigation } from "@/lib/hooks/useGridKeyboardNavigation.ts";

interface MediaAssetBrowserProps {
  assets: MediaAsset[];
  common: ReturnType<typeof useI18n>["messages"]["common"];
  copied: "url" | "markdown" | null;
  currentFolderId: number | null;
  draft: { name: string; alias: string };
  folderItemCounts: ReadonlyMap<number, number>;
  folders: MediaFolder[];
  gridStyle: CSSProperties;
  status: {
    deleting: boolean;
    loading: boolean;
    renaming: boolean;
    showTileText: boolean;
  };
  linkedContentUsages: MediaLinkedContentUsage[];
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onAreaClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onAreaContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onAreaKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onAreaMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onCopyMarkdownEmbed: () => void;
  onCopyUrl: () => void;
  onDeleteFolder: () => void;
  onDeleteMixedSelection: () => void;
  onDeleteSingle: () => void;
  onDraftChange: (draft: { name: string; alias: string }) => void;
  onFolderContextMenu?: (event: ReactMouseEvent<HTMLElement>, folderId: number) => void;
  onItemContextMenu?: (event: ReactMouseEvent<HTMLElement>, assetId: number) => void;
  onOpenFolder: (folderId: number) => void;
  onRenameFolder: () => void;
  onSaveMeta: () => void;
  onSetFolderColor: (folderId: number, color: MediaFolderColor) => void;
  onSelectItem: (
    target: { kind: "asset" | "folder"; id: number },
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) => void;
  selectedAssetIdSet: ReadonlySet<number>;
  selectedAssets: MediaAsset[];
  selectedFolderIdSet: ReadonlySet<number>;
  selectedFolders: MediaFolder[];
  selectionAreaRef: RefObject<HTMLDivElement | null>;
  selectionBox: SelectionBox | null;
}

export function MediaAssetBrowser({
  assets,
  common,
  copied,
  currentFolderId,
  draft,
  folderItemCounts,
  folders,
  gridStyle,
  status,
  linkedContentUsages,
  locale,
  mediaMessages,
  onAreaClick,
  onAreaContextMenu,
  onAreaKeyDown,
  onAreaMouseDown,
  onCopyMarkdownEmbed,
  onCopyUrl,
  onDeleteFolder,
  onDeleteMixedSelection,
  onDeleteSingle,
  onDraftChange,
  onFolderContextMenu,
  onItemContextMenu,
  onOpenFolder,
  onRenameFolder,
  onSaveMeta,
  onSetFolderColor,
  onSelectItem,
  selectedAssetIdSet,
  selectedAssets,
  selectedFolderIdSet,
  selectedFolders,
  selectionAreaRef,
  selectionBox,
}: MediaAssetBrowserProps) {
  const { deleting, loading, renaming, showTileText } = status;
  const gridRef = useRef<HTMLDivElement>(null);
  const { onKeyDown: onGridKeyDown } = useGridKeyboardNavigation({
    containerRef: gridRef,
    itemSelector: "[data-media-asset-item]",
    itemCount: assets.length,
    enabled: !loading,
  });

  function handleAreaKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onGridKeyDown(event);
    if (event.defaultPrevented) return;
    onAreaKeyDown(event);
  }

  if (assets.length === 0 && folders.length === 0) {
    return (
      !loading && (
        <div className="flex flex-1 min-h-0 items-center justify-center">
          <ContentUnavailableView
            chromeless
            icon={<ImageIcon weight="duotone" aria-hidden />}
            title={
              currentFolderId === null ? mediaMessages.empty : mediaMessages.folders.emptyFolder
            }
            subtitle={currentFolderId === null ? mediaMessages.emptyHint : ""}
          />
        </div>
      )
    );
  }

  const totalSelected = selectedAssets.length + selectedFolders.length;
  const singleAsset =
    selectedAssets.length === 1 && selectedFolders.length === 0 ? selectedAssets[0] : null;
  const singleFolder =
    selectedFolders.length === 1 && selectedAssets.length === 0 ? selectedFolders[0] : null;

  return (
    <PageSplitLayout className="flex-1 min-h-0">
      <PageSplitMain>
        <div
          ref={selectionAreaRef}
          className="relative flex flex-1 min-h-0 flex-col"
          role="application"
          aria-label={mediaMessages.title}
          tabIndex={-1}
          onClick={onAreaClick}
          onKeyDown={handleAreaKeyDown}
          onMouseDown={onAreaMouseDown}
          onContextMenu={onAreaContextMenu}
        >
          {loading ? (
            <div className="grid gap-3" style={gridStyle}>
              {Array.from({ length: 12 }, (_, index) => `media-sk-${index}`).map((key) => (
                <div
                  key={key}
                  className={`aspect-square ${mediaGridItemInsetClass} ${mediaGridItemOuterRadiusClass} animate-pulse border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-elevated)]`}
                >
                  <div
                    className={`size-full ${mediaGridItemPreviewRadiusClass} bg-[var(--ds-surface)]`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div ref={gridRef} className="grid gap-3" style={gridStyle}>
              {folders.map((folder) => (
                <MediaFolderGridItem
                  key={`folder-${folder.id}`}
                  folder={folder}
                  selected={selectedFolderIdSet.has(folder.id)}
                  itemCount={folderItemCounts.get(folder.id) ?? 0}
                  showText={showTileText}
                  onSelect={(id, event) => onSelectItem({ kind: "folder", id }, event)}
                  onOpen={onOpenFolder}
                  onContextMenu={onFolderContextMenu}
                />
              ))}
              {assets.map((asset) => (
                <MediaGridItem
                  key={`asset-${asset.id}`}
                  asset={asset}
                  selected={selectedAssetIdSet.has(asset.id)}
                  showText={showTileText}
                  onSelect={(id, event) => onSelectItem({ kind: "asset", id }, event)}
                  onContextMenu={onItemContextMenu}
                />
              ))}
            </div>
          )}
          {selectionBox && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-20 rounded border border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
              style={{
                left: selectionBox.left,
                top: selectionBox.top,
                width: selectionBox.width,
                height: selectionBox.height,
              }}
            />
          )}
        </div>
      </PageSplitMain>

      <PageSplitAside className="flex flex-col xl:sticky xl:top-[4.75rem] xl:max-h-[calc(100vh-5.25rem)] xl:overflow-y-auto">
        {singleAsset ? (
          <MediaDetailSidebar
            asset={singleAsset}
            draft={draft}
            onDraftChange={onDraftChange}
            onSaveMeta={onSaveMeta}
            onDelete={onDeleteSingle}
            onCopyUrl={onCopyUrl}
            onCopyMarkdownEmbed={onCopyMarkdownEmbed}
            copied={copied}
            isRenaming={renaming}
            locale={locale}
            mediaMessages={mediaMessages}
            common={common}
            usages={linkedContentUsages}
          />
        ) : singleFolder ? (
          <MediaFolderSidebar
            folder={singleFolder}
            itemCount={folderItemCounts.get(singleFolder.id) ?? 0}
            isDeleting={deleting}
            locale={locale}
            mediaMessages={mediaMessages}
            onDelete={onDeleteFolder}
            onRename={onRenameFolder}
            onSetColor={(color) => onSetFolderColor(singleFolder.id, color)}
          />
        ) : totalSelected > 1 ? (
          <MediaSelectionSidebar
            assets={selectedAssets}
            folders={selectedFolders}
            onDelete={onDeleteMixedSelection}
            isDeleting={deleting}
            locale={locale}
            mediaMessages={mediaMessages}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center min-h-[22rem]">
            <ContentUnavailableView
              icon={<FileIcon weight="duotone" aria-hidden />}
              title={mediaMessages.detailsTitle}
              subtitle={mediaMessages.selectPrompt}
            />
          </div>
        )}
      </PageSplitAside>
    </PageSplitLayout>
  );
}
