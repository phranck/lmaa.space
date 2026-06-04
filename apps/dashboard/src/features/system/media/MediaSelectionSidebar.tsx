import { FileIcon } from "@phosphor-icons/react";

import type { MediaAsset, MediaFolder } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { FormLabelText } from "@lmaa/ui/form-primitives";

import { DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { formatBytes } from "@/features/system/media/media-utils.ts";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface MediaSelectionSidebarProps {
  assets: MediaAsset[];
  folders: MediaFolder[];
  isDeleting: boolean;
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onDelete: () => void;
}

export function MediaSelectionSidebar({
  assets,
  folders,
  isDeleting,
  locale,
  mediaMessages,
  onDelete,
}: MediaSelectionSidebarProps) {
  const totalSize = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);

  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<FileIcon weight="duotone" className="size-4" />}
        title={mediaMessages.selectionTitle}
      />
      <DashboardSection.Body>
        <div className="space-y-3 text-sm">
          <div>
            <FormLabelText>{mediaMessages.selectedCount}</FormLabelText>
            <p className="text-[var(--ds-text)]">
              {assets.length + folders.length}
              {folders.length > 0 && assets.length > 0 && (
                <span className="ml-1 text-[var(--ds-text-muted)] text-xs">
                  ({mediaMessages.folders.itemsCount(folders.length)} + Assets)
                </span>
              )}
            </p>
          </div>
          <div>
            <FormLabelText>{mediaMessages.selectedSize}</FormLabelText>
            <p className="text-[var(--ds-text)]">{formatBytes(totalSize, locale)}</p>
          </div>
        </div>

        <DeleteActionButton
          onClick={onDelete}
          disabled={isDeleting}
          className="w-full"
          label={mediaMessages.deleteSelected}
        />
      </DashboardSection.Body>
    </DashboardSection>
  );
}
