import { useMemo } from "react";

import type { MediaAsset } from "@lmaa/shared";

import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { FileIcon, ImageIcon } from "@phosphor-icons/react";

import {
  formatBytes,
  formatMediaDate,
  getMediaTypeLabel,
  isImageAsset,
} from "@/features/system/media/media-utils.ts";

interface MediaTableProps {
  assets: MediaAsset[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function MediaThumb({ asset }: { asset: MediaAsset }) {
  const imageAsset = isImageAsset(asset);

  return (
    <div className="w-28 h-[63px] rounded-lg overflow-hidden bg-[var(--ds-bg-elevated)] shrink-0 flex items-center justify-center">
      {imageAsset ? (
        <img src={asset.url} alt="" loading="lazy" className="block w-full h-full object-cover" />
      ) : (
        <FileIcon weight="duotone" className="w-7 h-7 text-[var(--ds-text-subtle)]" />
      )}
    </div>
  );
}

export function MediaTable({ assets, selectedId, onSelect }: MediaTableProps) {
  const { locale, messages } = useI18n();
  const mediaMessages = messages.media;

  const columns = useMemo<ColumnDef<MediaAsset>[]>(
    () => [
      {
        id: "preview",
        className: "w-32",
        cell: (asset) => (
          <button type="button" onClick={() => onSelect(asset.id)} className="block">
            <MediaThumb asset={asset} />
          </button>
        ),
      },
      {
        id: "name",
        header: mediaMessages.table.name,
        sortKey: (asset) => asset.displayName.toLowerCase(),
        cell: (asset) => (
          <button
            type="button"
            onClick={() => onSelect(asset.id)}
            className="text-left flex flex-col min-w-0"
          >
            <span className="font-medium text-[var(--ds-text)] truncate">{asset.displayName}</span>
            <span className="text-xs text-[var(--ds-text-subtle)] truncate">
              {asset.originalName}
            </span>
          </button>
        ),
      },
      {
        id: "type",
        header: mediaMessages.table.type,
        sortKey: (asset) => asset.mimeType,
        cell: (asset) => (
          <span className="inline-flex items-center gap-2 text-[var(--ds-text-muted)]">
            {isImageAsset(asset) ? (
              <ImageIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <FileIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
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
    [locale, mediaMessages, onSelect],
  );

  return (
    <DataTable
      columns={columns}
      data={assets}
      getRowKey={(asset) => asset.id}
      getRowClassName={(asset) =>
        asset.id === selectedId
          ? "bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--ds-surface))]"
          : ""
      }
      stickyHeader
    />
  );
}
