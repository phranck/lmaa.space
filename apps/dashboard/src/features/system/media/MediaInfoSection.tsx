import { formatDateTime, type MediaAsset } from "@lmaa/shared";
import { FormLabelText } from "@lmaa/ui/form-primitives";

import { CopyActionButton } from "@/components/ui/DashboardActionButton.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import {
  formatBytes,
  getHlsMarkdownEmbed,
  isHlsBundleAsset,
} from "@/features/system/media/media-utils.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface MediaInfoSectionProps {
  asset: MediaAsset;
  copied: "url" | "markdown" | null;
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onCopyMarkdownEmbed: () => void;
  onCopyUrl: () => void;
}

function MediaInfoItem({
  label,
  value,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <FormLabelText>{label}</FormLabelText>
      <p className={`text-[var(--ds-text)] ${valueClassName}`}>{value}</p>
    </div>
  );
}

function MediaCodeField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FormLabelText>{label}</FormLabelText>
      <div className="mt-1 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-2 font-mono text-xs text-[var(--ds-text)] break-all">
        {value}
      </div>
    </div>
  );
}

export function MediaInfoSection({
  asset,
  copied,
  locale,
  mediaMessages,
  onCopyMarkdownEmbed,
  onCopyUrl,
}: MediaInfoSectionProps) {
  return (
    <>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <MediaInfoItem
            label={mediaMessages.originalName}
            value={asset.originalName}
            className="col-span-2"
            valueClassName="break-all"
          />
          <MediaInfoItem label={mediaMessages.fileType} value={asset.mimeType} />
          <MediaInfoItem
            label={mediaMessages.fileSize}
            value={formatBytes(asset.sizeBytes, locale)}
          />
          {asset.width && asset.height && (
            <MediaInfoItem
              label={mediaMessages.dimensions}
              value={`${asset.width} x ${asset.height}px`}
            />
          )}
          <MediaInfoItem
            label={mediaMessages.createdAt}
            value={formatDateTime(asset.createdAt, locale)}
          />
          <MediaInfoItem
            label={mediaMessages.updatedAt}
            value={formatDateTime(asset.updatedAt, locale)}
          />
          <MediaInfoItem
            label={mediaMessages.uploadedBy}
            value={asset.createdByUsername ?? "---"}
          />
        </div>

        <MediaCodeField label={mediaMessages.internalUrl} value={asset.url} />

        {isHlsBundleAsset(asset) && asset.posterUrl && (
          <MediaCodeField label={mediaMessages.posterUrl} value={asset.posterUrl} />
        )}

        {isHlsBundleAsset(asset) && (
          <MediaCodeField label={mediaMessages.markdownEmbed} value={getHlsMarkdownEmbed(asset)} />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <CopyActionButton
          onClick={onCopyUrl}
          className="w-full"
          label={copied === "url" ? mediaMessages.copied : mediaMessages.copyUrl}
        />
        {isHlsBundleAsset(asset) && (
          <CopyActionButton
            onClick={onCopyMarkdownEmbed}
            className="w-full"
            label={copied === "markdown" ? mediaMessages.copied : mediaMessages.copyMarkdownEmbed}
          />
        )}
      </div>
    </>
  );
}
