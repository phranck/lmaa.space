import { FileIcon } from "@phosphor-icons/react";

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
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors text-center"
    >
      <div
        className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
          selected
            ? "border-[var(--color-primary)]"
            : "border-transparent hover:border-[var(--ds-border)]"
        }`}
      >
        {imageAsset ? (
          <img src={asset.url} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[var(--ds-bg-elevated)] flex flex-col items-center justify-center text-[var(--ds-text-subtle)] gap-2">
            <FileIcon weight="duotone" className="size-10" />
            <span className="text-[10px] font-semibold tracking-wide">{getMediaTypeLabel(asset)}</span>
          </div>
        )}
      </div>
      <div className="w-full px-0.5">
        <p className={`text-xs font-medium truncate ${selected ? "text-[var(--color-primary)]" : "text-[var(--ds-text)]"}`}>
          {asset.displayName}
        </p>
        <p className="text-[10px] text-[var(--ds-text-muted)] truncate">
          {formatBytes(asset.sizeBytes, locale)}
        </p>
      </div>
    </button>
  );
}
