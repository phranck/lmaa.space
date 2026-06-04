import { FolderIcon } from "@phosphor-icons/react";

import type { MediaFolder, MediaFolderColor } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { FormLabelText } from "@lmaa/ui/form-primitives";

import { DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { EditActionButton } from "@/components/ui/DashboardActionButton.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { formatBytes, formatMediaDate } from "@/features/system/media/media-utils.ts";
import { MediaFolderColorPicker } from "@/features/system/media/MediaFolderColorPicker.tsx";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface MediaFolderSidebarProps {
  folder: MediaFolder;
  itemCount: number;
  isDeleting: boolean;
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onDelete: () => void;
  onRename: () => void;
  onSetColor: (color: MediaFolderColor) => void;
}

/**
 * Right-aside detail view for a single selected folder. Mirrors the rhythm of
 * MediaDetailSidebar / MediaSelectionSidebar — Header with folder name,
 * Body with stats (item count, total size, createdAt) and the rename / delete
 * action buttons.
 */
export function MediaFolderSidebar({
  folder,
  itemCount,
  isDeleting,
  locale,
  mediaMessages,
  onDelete,
  onRename,
  onSetColor,
}: MediaFolderSidebarProps) {
  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<FolderIcon weight="duotone" className="size-4" />}
        title={folder.name}
      />
      <DashboardSection.Body>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <FormLabelText>{mediaMessages.folders.itemsCount(itemCount)}</FormLabelText>
              <p className="text-[var(--ds-text)]">{formatBytes(folder.sizeBytes, locale)}</p>
            </div>
            <div className="min-w-0">
              <FormLabelText>{mediaMessages.createdAt}</FormLabelText>
              <p className="text-[var(--ds-text)]">{formatMediaDate(folder.createdAt, locale)}</p>
            </div>
          </div>
          <div>
            <FormLabelText>{mediaMessages.contextMenu.folderColorLabel}</FormLabelText>
            <MediaFolderColorPicker
              className="mt-2 p-0"
              color={folder.color}
              label={mediaMessages.contextMenu.folderColorLabel}
              labels={mediaMessages.contextMenu.folderColorNames}
              onChange={onSetColor}
            />
          </div>
        </div>

        {!folder.isSystem && (
          <>
            <EditActionButton
              onClick={onRename}
              className="mt-3 w-full"
              label={mediaMessages.contextMenu.renameFolderInline}
            />

            <DeleteActionButton
              onClick={onDelete}
              disabled={isDeleting}
              className="mt-2 w-full"
              label={mediaMessages.contextMenu.deleteFolder}
            />
          </>
        )}
      </DashboardSection.Body>
    </DashboardSection>
  );
}
