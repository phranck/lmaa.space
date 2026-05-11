import { FileIcon, ImageIcon, PencilSimpleIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import {
  CopyActionButton,
  DeleteActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import {
  formatBytes,
  formatMediaDate,
  getMediaTypeLabel,
  isImageAsset,
} from "@/features/system/media/media-utils.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

function MediaPreview({
  asset,
  unsupportedPreview,
}: {
  asset: MediaAsset;
  unsupportedPreview: string;
}) {
  if (isImageAsset(asset)) {
    return (
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--ds-bg-elevated)]">
        <img src={asset.url} alt="" className="size-full object-cover" />
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] rounded-xl bg-[var(--ds-bg-elevated)] border border-dashed border-[var(--ds-border)] flex flex-col items-center justify-center gap-3 text-[var(--ds-text-subtle)]">
      <FileIcon weight="duotone" className="size-12" />
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--ds-text)]">{getMediaTypeLabel(asset)}</p>
        <p className="text-xs">{unsupportedPreview}</p>
      </div>
    </div>
  );
}

interface MediaDetailSidebarProps {
  asset: MediaAsset;
  draft: { name: string; alias: string };
  onDraftChange: (draft: { name: string; alias: string }) => void;
  onSaveMeta: () => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  copied: boolean;
  isRenaming: boolean;
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  common: ReturnType<typeof useI18n>["messages"]["common"];
}

export function MediaDetailSidebar({
  asset,
  draft,
  onDraftChange,
  onSaveMeta,
  onDelete,
  onCopyUrl,
  copied,
  isRenaming,
  locale,
  mediaMessages,
  common,
}: MediaDetailSidebarProps) {
  return (
    <div className="space-y-3">
      <DashboardSection>
        <DashboardSection.Header
          icon={<ImageIcon weight="duotone" className="size-4" />}
          title={mediaMessages.previewTitle}
        />
        <DashboardSection.Body>
          <MediaPreview asset={asset} unsupportedPreview={mediaMessages.unsupportedPreview} />
        </DashboardSection.Body>
      </DashboardSection>

      <DashboardSection>
        <DashboardSection.Header
          icon={<PencilSimpleIcon weight="duotone" className="size-4" />}
          title={mediaMessages.detailsTitle}
        />
        <DashboardSection.Body>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ds-text)]">
              {mediaMessages.displayName}
            </span>
            <DashboardInput
              type="text"
              value={draft.name}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ds-text)]">Alias</span>
            <DashboardInput
              type="text"
              value={draft.alias}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  alias: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })
              }
              placeholder="z.B. sepa-qr"
              className="font-mono"
            />
            <p className="text-xs text-[var(--ds-text-subtle)]">
              {draft.alias
                ? `Verwendung: [[image:${draft.alias}]] oder [[pdf:${draft.alias}]]`
                : "Optional. Erlaubt: a-z, 0-9, Bindestrich."}
            </p>
          </label>

          <div className="flex gap-2">
            <SaveActionButton
              onClick={onSaveMeta}
              disabled={
                isRenaming ||
                draft.name.trim().length === 0 ||
                (draft.name.trim() === asset.displayName &&
                  (draft.alias.trim() || null) === (asset.alias ?? null))
              }
              className="flex-1"
              busy={isRenaming}
              label={isRenaming ? common.saving : mediaMessages.saveName}
            />
            <DeleteActionButton onClick={onDelete} iconOnly label={common.delete} />
          </div>
        </DashboardSection.Body>
      </DashboardSection>

      <DashboardSection>
        <DashboardSection.Header
          icon={<FileIcon weight="duotone" className="size-4" />}
          title={mediaMessages.infoTitle}
        />
        <DashboardSection.Body>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.originalName}</p>
              <p className="text-[var(--ds-text)] break-all">{asset.originalName}</p>
            </div>
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.fileType}</p>
              <p className="text-[var(--ds-text)]">{asset.mimeType}</p>
            </div>
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.fileSize}</p>
              <p className="text-[var(--ds-text)]">{formatBytes(asset.sizeBytes, locale)}</p>
            </div>
            {asset.width && asset.height && (
              <div>
                <p className="text-[var(--ds-text-subtle)]">{mediaMessages.dimensions}</p>
                <p className="text-[var(--ds-text)]">
                  {asset.width} x {asset.height}px
                </p>
              </div>
            )}
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.createdAt}</p>
              <p className="text-[var(--ds-text)]">{formatMediaDate(asset.createdAt, locale)}</p>
            </div>
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.updatedAt}</p>
              <p className="text-[var(--ds-text)]">{formatMediaDate(asset.updatedAt, locale)}</p>
            </div>
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.uploadedBy}</p>
              <p className="text-[var(--ds-text)]">{asset.createdByUsername ?? "---"}</p>
            </div>
            <div>
              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.internalUrl}</p>
              <div className="mt-1 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-2 font-mono text-xs text-[var(--ds-text)] break-all">
                {asset.url}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <CopyActionButton
              onClick={onCopyUrl}
              className="flex-1"
              label={copied ? mediaMessages.copied : mediaMessages.copyUrl}
            />
          </div>
        </DashboardSection.Body>
      </DashboardSection>
    </div>
  );
}
