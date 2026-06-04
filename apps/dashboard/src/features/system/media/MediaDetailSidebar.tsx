import { FileIcon, ImageIcon, PencilSimpleIcon } from "@phosphor-icons/react";

import type { MediaAsset } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import type { useI18n } from "@/context/I18nContext.tsx";
import { MediaInfoSection } from "@/features/system/media/MediaInfoSection.tsx";
import type { MediaLinkedContentUsage } from "@/features/system/media/MediaLinkedContentSection.tsx";
import { MediaMetaFormSection } from "@/features/system/media/MediaMetaFormSection.tsx";
import { MediaPreview } from "@/features/system/media/MediaPreview.tsx";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface MediaDetailSidebarProps {
  asset: MediaAsset;
  draft: { name: string; alias: string };
  onDraftChange: (draft: { name: string; alias: string }) => void;
  onSaveMeta: () => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  onCopyMarkdownEmbed: () => void;
  copied: "url" | "markdown" | null;
  isRenaming: boolean;
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  common: ReturnType<typeof useI18n>["messages"]["common"];
  usages: MediaLinkedContentUsage[];
}

export function MediaDetailSidebar({
  asset,
  draft,
  onDraftChange,
  onSaveMeta,
  onDelete,
  onCopyUrl,
  onCopyMarkdownEmbed,
  copied,
  isRenaming,
  locale,
  mediaMessages,
  common,
  usages,
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
          <MediaMetaFormSection
            asset={asset}
            common={common}
            draft={draft}
            isRenaming={isRenaming}
            mediaMessages={mediaMessages}
            onDelete={onDelete}
            onDraftChange={onDraftChange}
            onSaveMeta={onSaveMeta}
            usages={usages}
          />
        </DashboardSection.Body>
      </DashboardSection>

      <DashboardSection>
        <DashboardSection.Header
          icon={<FileIcon weight="duotone" className="size-4" />}
          title={mediaMessages.infoTitle}
        />
        <DashboardSection.Body>
          <MediaInfoSection
            asset={asset}
            copied={copied}
            locale={locale}
            mediaMessages={mediaMessages}
            onCopyMarkdownEmbed={onCopyMarkdownEmbed}
            onCopyUrl={onCopyUrl}
          />
        </DashboardSection.Body>
      </DashboardSection>
    </div>
  );
}
