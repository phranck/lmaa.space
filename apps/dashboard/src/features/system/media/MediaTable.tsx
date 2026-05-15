import { FileIcon, ImageIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { memo, useMemo, useState } from "react";

import type { MediaAsset } from "@lmaa/shared";

import { type ColumnDef, DataTable, type SortState } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { HlsAssetVisual, HlsTypeBadge } from "@/features/system/media/HlsAssetVisual.tsx";
import {
  formatBytes,
  formatMediaDate,
  getMediaTypeLabel,
  isHlsBundleAsset,
  isImageAsset,
  isVideoAsset,
} from "@/features/system/media/media-utils.ts";

interface MediaTableProps {
  assets: MediaAsset[];
  selectedIds: ReadonlySet<number>;
  onSelect: (
    id: number,
    event: React.MouseEvent<HTMLTableRowElement> | React.KeyboardEvent<HTMLTableRowElement>,
    visibleOrderIds: number[],
  ) => void;
}

const mediaTableSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const MediaThumb = memo(function MediaThumb({ asset }: { asset: MediaAsset }) {
  const imageAsset = isImageAsset(asset);
  const hlsAsset = isHlsBundleAsset(asset);
  const videoAsset = isVideoAsset(asset);

  return (
    <div className="size-16 rounded-lg overflow-hidden bg-[var(--ds-bg-elevated)] shrink-0 flex items-center justify-center">
      {imageAsset ? (
        <img src={asset.url} alt="" loading="lazy" className="block size-full object-cover" />
      ) : hlsAsset && asset.posterUrl ? (
        <img src={asset.posterUrl} alt="" loading="lazy" className="block size-full object-cover" />
      ) : hlsAsset ? (
        <HlsAssetVisual compact />
      ) : videoAsset ? (
        <VideoCameraIcon weight="duotone" className="size-6 text-[var(--ds-text-subtle)]" />
      ) : (
        <FileIcon weight="duotone" className="size-6 text-[var(--ds-text-subtle)]" />
      )}
    </div>
  );
});

export function MediaTable({ assets, selectedIds, onSelect }: MediaTableProps) {
  const { locale, messages } = useI18n();
  const mediaMessages = messages.media;
  const [sort, setSort] = useState<SortState | null>(null);

  const columns = useMemo<ColumnDef<MediaAsset>[]>(
    () => [
      {
        id: "preview",
        className: "w-20",
        cell: (asset) => <MediaThumb asset={asset} />,
      },
      {
        id: "name",
        header: mediaMessages.table.name,
        sortKey: (asset) => asset.displayName.toLowerCase(),
        cell: (asset) => (
          <div className="flex min-w-0 flex-col text-left">
            <span className="font-medium text-[var(--ds-text)] truncate">{asset.displayName}</span>
            <span className="text-xs text-[var(--ds-text-subtle)] truncate">
              {asset.originalName}
            </span>
          </div>
        ),
      },
      {
        id: "type",
        header: mediaMessages.table.type,
        sortKey: (asset) => asset.mimeType,
        cell: (asset) => (
          <span className="inline-flex items-center gap-2 text-[var(--ds-text-muted)]">
            {isImageAsset(asset) ? (
              <ImageIcon weight="duotone" className="size-3.5 shrink-0" />
            ) : isHlsBundleAsset(asset) ? (
              <HlsTypeBadge />
            ) : isVideoAsset(asset) ? (
              <VideoCameraIcon weight="duotone" className="size-3.5 shrink-0" />
            ) : (
              <FileIcon weight="duotone" className="size-3.5 shrink-0" />
            )}
            {getMediaTypeLabel(asset)}
          </span>
        ),
      },
      {
        id: "size",
        header: mediaMessages.table.size,
        className: "w-28",
        sortKey: (asset) => asset.sizeBytes,
        cell: (asset) => (
          <span className="text-[var(--ds-text-muted)]">
            {formatBytes(asset.sizeBytes, locale)}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: mediaMessages.table.updated,
        className: "w-52",
        sortKey: (asset) => asset.updatedAt,
        cell: (asset) => (
          <span className="text-[var(--ds-text-muted)]">
            {formatMediaDate(asset.updatedAt, locale)}
          </span>
        ),
      },
    ],
    [locale, mediaMessages],
  );

  const visibleAssets = useMemo(() => {
    if (!sort) return assets;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortKey) return assets;

    return Array.from(assets).sort((a, b) => {
      const aValue = column.sortKey?.(a);
      const bValue = column.sortKey?.(b);
      const comparison =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : mediaTableSortCollator.compare(String(aValue), String(bValue));
      return sort.dir === "asc" ? comparison : -comparison;
    });
  }, [assets, columns, sort]);

  const visibleAssetIds = useMemo(() => visibleAssets.map((asset) => asset.id), [visibleAssets]);

  return (
    <DataTable
      columns={columns}
      data={assets}
      getRowKey={(asset) => asset.id}
      getRowProps={(asset) => ({
        "aria-selected": selectedIds.has(asset.id),
        "data-media-asset-item": true,
        "data-media-asset-id": asset.id,
        role: "button",
        tabIndex: 0,
        onClick: (event) => onSelect(asset.id, event, visibleAssetIds),
        onKeyDown: (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onSelect(asset.id, event, visibleAssetIds);
        },
        className:
          "cursor-default select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--ds-focus-ring)]",
      })}
      getRowClassName={(asset) =>
        selectedIds.has(asset.id)
          ? "bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--ds-surface))]"
          : ""
      }
      sort={sort}
      onSortChange={setSort}
      stickyHeader
    />
  );
}
