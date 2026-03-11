import { FileIcon, ImageIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";
import {
  formatBytes,
  getMediaTypeLabel,
  isImageAsset,
} from "@/features/system/media/media-utils.ts";

interface MediaGridItemProps {
  asset: MediaAsset;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function MediaGridItem({ asset, selected, onSelect }: MediaGridItemProps) {
  const { locale } = useI18n();
  const imageAsset = isImageAsset(asset);

  return (
    <button
      type="button"
      onClick={() => onSelect(asset.id)}
      className={`relative text-left bg-[var(--ds-surface)] rounded-card border flex flex-col overflow-hidden transition-colors card-hover ${
        selected
          ? "border-[var(--color-primary)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
          : "border-[var(--ds-border)]"
      }`}
    >
      <div className="aspect-[4/3] overflow-hidden rounded-t-[var(--radius-card)] bg-[var(--ds-bg-elevated)] flex items-center justify-center">
        {imageAsset ? (
          <img src={asset.url} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-[var(--ds-text-subtle)] gap-2">
            <FileIcon weight="duotone" className="w-10 h-10" />
            <span className="text-xs font-semibold tracking-wide">{getMediaTypeLabel(asset)}</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="font-medium text-[var(--ds-text)] text-sm truncate">{asset.displayName}</p>
          <p className="text-xs text-[var(--ds-text-subtle)] truncate">{asset.originalName}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
          {imageAsset ? (
            <ImageIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <FileIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{getMediaTypeLabel(asset)}</span>
          <span>·</span>
          <span>{formatBytes(asset.sizeBytes, locale)}</span>
        </div>
      </div>
    </button>
  );
}
