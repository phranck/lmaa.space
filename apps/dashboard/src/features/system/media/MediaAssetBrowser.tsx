import { FileIcon, ImageIcon } from "@phosphor-icons/react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from "react";

import type { MediaAsset } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { PageSplitAside, PageSplitLayout, PageSplitMain } from "@/components/ui/PageLayout.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import {
  MediaDetailSidebar,
  MediaSelectionSidebar,
} from "@/features/system/media/MediaDetailSidebar.tsx";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";
import { MediaTable } from "@/features/system/media/MediaTable.tsx";
import type { SelectionBox } from "@/features/system/media/useMediaSelection.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

type ViewMode = "list" | "grid";

interface MediaAssetBrowserProps {
  assets: MediaAsset[];
  common: ReturnType<typeof useI18n>["messages"]["common"];
  copied: "url" | "markdown" | null;
  draft: { name: string; alias: string };
  isDeleting: boolean;
  isLoading: boolean;
  isRenaming: boolean;
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onAreaClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onAreaKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onAreaMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onCopyMarkdownEmbed: () => void;
  onCopyUrl: () => void;
  onDeleteSelection: () => void;
  onDeleteSingle: () => void;
  onDraftChange: (draft: { name: string; alias: string }) => void;
  onSaveMeta: () => void;
  onSelectAsset: (
    id: number,
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
    visibleOrderIds?: number[],
  ) => void;
  selectedAsset: MediaAsset | null;
  selectedAssets: MediaAsset[];
  selectedIdSet: ReadonlySet<number>;
  selectionAreaRef: RefObject<HTMLDivElement | null>;
  selectionBox: SelectionBox | null;
  viewMode: ViewMode;
}

export function MediaAssetBrowser({
  assets,
  common,
  copied,
  draft,
  isDeleting,
  isLoading,
  isRenaming,
  locale,
  mediaMessages,
  onAreaClick,
  onAreaKeyDown,
  onAreaMouseDown,
  onCopyMarkdownEmbed,
  onCopyUrl,
  onDeleteSelection,
  onDeleteSingle,
  onDraftChange,
  onSaveMeta,
  onSelectAsset,
  selectedAsset,
  selectedAssets,
  selectedIdSet,
  selectionAreaRef,
  selectionBox,
  viewMode,
}: MediaAssetBrowserProps) {
  if (assets.length === 0) {
    return (
      !isLoading && (
        <ContentUnavailableView
          chromeless
          icon={<ImageIcon weight="duotone" aria-hidden />}
          title={mediaMessages.empty}
          subtitle={mediaMessages.emptyHint}
          className="flex-1 min-h-0"
        />
      )
    );
  }

  return (
    <PageSplitLayout>
      <PageSplitMain>
        <div
          ref={selectionAreaRef}
          className="relative flex flex-1 min-h-0 flex-col"
          role="group"
          tabIndex={-1}
          onClick={onAreaClick}
          onKeyDown={onAreaKeyDown}
          onMouseDown={onAreaMouseDown}
        >
          {isLoading && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "space-y-2"
              }
            >
              {Array.from({ length: 8 }, (_, index) => `media-sk-${index}`).map((key) => (
                <div
                  key={key}
                  className={`bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-16"}`}
                />
              ))}
            </div>
          )}

          {!isLoading && viewMode === "list" && (
            <div className="-mx-3 -mt-3">
              <MediaTable assets={assets} selectedIds={selectedIdSet} onSelect={onSelectAsset} />
            </div>
          )}

          {!isLoading && viewMode === "grid" && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {assets.map((asset) => (
                <MediaGridItem
                  key={asset.id}
                  asset={asset}
                  selected={selectedIdSet.has(asset.id)}
                  onSelect={(id, event) => onSelectAsset(id, event)}
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

      <PageSplitAside className="self-start xl:sticky xl:top-[4.75rem]">
        {selectedAsset ? (
          <MediaDetailSidebar
            asset={selectedAsset}
            draft={draft}
            onDraftChange={onDraftChange}
            onSaveMeta={onSaveMeta}
            onDelete={onDeleteSingle}
            onCopyUrl={onCopyUrl}
            onCopyMarkdownEmbed={onCopyMarkdownEmbed}
            copied={copied}
            isRenaming={isRenaming}
            locale={locale}
            mediaMessages={mediaMessages}
            common={common}
          />
        ) : selectedAssets.length > 1 ? (
          <MediaSelectionSidebar
            assets={selectedAssets}
            onDelete={onDeleteSelection}
            isDeleting={isDeleting}
            locale={locale}
            mediaMessages={mediaMessages}
          />
        ) : (
          <ContentUnavailableView
            icon={<FileIcon weight="duotone" aria-hidden />}
            title={mediaMessages.detailsTitle}
            subtitle={mediaMessages.selectPrompt}
            className="flex-1 min-h-[22rem]"
          />
        )}
      </PageSplitAside>
    </PageSplitLayout>
  );
}
