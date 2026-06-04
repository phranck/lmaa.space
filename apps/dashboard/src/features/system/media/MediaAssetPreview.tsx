// biome-ignore-all lint/a11y/useMediaCaption: Uploaded dashboard videos do not have managed caption tracks yet.
import { FileIcon, VideoCameraIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";
import { FormHelpText } from "@lmaa/ui/form-primitives";

import { resolveDashboardMediaUrl } from "@/features/system/media/dashboard-media-url.ts";
import { HlsAssetVisual } from "@/features/system/media/HlsAssetVisual.tsx";
import {
  getMediaTypeLabel,
  isHlsBundleAsset,
  isImageAsset,
  isVideoAsset,
} from "@/features/system/media/media-utils.ts";

type MediaAssetPreviewVariant = "content-card" | "content-grid" | "detail" | "grid";

interface MediaAssetPreviewProps {
  alt?: string;
  asset: MediaAsset;
  className?: string;
  unsupportedPreview?: string;
  variant: MediaAssetPreviewVariant;
}

const frameClassByVariant: Record<MediaAssetPreviewVariant, string> = {
  "content-card": "w-full overflow-hidden aspect-video bg-[var(--ds-input-bg)]",
  "content-grid": "size-full overflow-hidden bg-[var(--ds-input-bg)]",
  detail: "aspect-[4/3] overflow-hidden rounded-xl bg-[var(--ds-bg-elevated)]",
  grid: "aspect-square w-full overflow-hidden bg-[var(--ds-bg-elevated)]",
};

const iconSizeByVariant: Record<MediaAssetPreviewVariant, string> = {
  "content-card": "size-10",
  "content-grid": "size-7",
  detail: "size-12",
  grid: "size-7",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function MediaAssetPreview({
  alt,
  asset,
  className,
  unsupportedPreview,
  variant,
}: MediaAssetPreviewProps) {
  const fallbackAlt = alt ?? asset.displayName;
  const frameClassName = cx(frameClassByVariant[variant], className);
  const visualClassName = "size-full object-cover";

  if (isImageAsset(asset)) {
    return (
      <div className={frameClassName}>
        <img
          src={resolveDashboardMediaUrl(asset.url)}
          alt={fallbackAlt}
          loading={variant === "detail" ? undefined : "lazy"}
          className={visualClassName}
        />
      </div>
    );
  }

  if (isHlsBundleAsset(asset)) {
    return (
      <div className={cx(frameClassName, "bg-[#080a14]")}>
        {asset.posterUrl ? (
          <img
            src={resolveDashboardMediaUrl(asset.posterUrl)}
            alt={fallbackAlt}
            loading={variant === "detail" ? undefined : "lazy"}
            className={visualClassName}
          />
        ) : (
          <HlsAssetVisual compact={variant !== "detail"} className="size-full" />
        )}
      </div>
    );
  }

  if (isVideoAsset(asset) && variant === "detail") {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-[#080a14]">
        {/* oxlint-disable-next-line react-doctor/media-has-caption -- Uploaded dashboard videos do not have managed caption tracks yet. */}
        <video
          src={resolveDashboardMediaUrl(asset.url)}
          aria-label={fallbackAlt}
          controls
          preload="metadata"
          playsInline
          className="size-full"
        />
      </div>
    );
  }

  if (isVideoAsset(asset) && (variant === "content-card" || variant === "content-grid")) {
    return (
      <div className={frameClassName}>
        <video
          src={resolveDashboardMediaUrl(asset.url)}
          className={visualClassName}
          muted
          playsInline
          preload="metadata"
          aria-label={fallbackAlt}
        />
      </div>
    );
  }

  const PreviewIcon = isVideoAsset(asset) ? VideoCameraIcon : FileIcon;
  const iconClassName = cx(iconSizeByVariant[variant], "text-[var(--ds-text-subtle)]");

  if (variant === "detail") {
    return (
      <div className="aspect-[4/3] rounded-xl bg-[var(--ds-bg-elevated)] border border-dashed border-[var(--ds-border)] flex flex-col items-center justify-center gap-3 text-[var(--ds-text-subtle)]">
        <PreviewIcon weight="duotone" className={iconClassName} />
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--ds-text)]">{getMediaTypeLabel(asset)}</p>
          {unsupportedPreview && <FormHelpText>{unsupportedPreview}</FormHelpText>}
        </div>
      </div>
    );
  }

  return (
    <div className={cx(frameClassName, "flex flex-col items-center justify-center gap-2")}>
      <PreviewIcon weight="duotone" className={iconClassName} />
      {variant === "grid" && (
        <span className="text-[9px] font-semibold tracking-wide text-[var(--ds-text-subtle)]">
          {getMediaTypeLabel(asset)}
        </span>
      )}
    </div>
  );
}
