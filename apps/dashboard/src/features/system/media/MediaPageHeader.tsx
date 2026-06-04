import { ArrowsClockwiseIcon, PlusCircleIcon } from "@phosphor-icons/react";

import type { MediaFolder } from "@lmaa/shared";

import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { MediaBreadcrumb } from "@/features/system/media/MediaBreadcrumb.tsx";
import { useMediaFilePicker } from "@/features/system/media/useMediaFilePicker.tsx";

interface MediaPageHeaderProps {
  ancestors: MediaFolder[];
  canSync: boolean;
  currentFolder: MediaFolder | null;
  isSyncing: boolean;
  isUploading: boolean;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onSync: () => void;
  onUploadFiles: (files: FileList | null) => void;
}

export function MediaPageHeader({
  ancestors,
  canSync,
  currentFolder,
  isSyncing,
  isUploading,
  mediaMessages,
  onSync,
  onUploadFiles,
}: MediaPageHeaderProps) {
  const { open, hiddenInput } = useMediaFilePicker({ onFiles: onUploadFiles });

  return (
    <PageHeader
      title={mediaMessages.title}
      titleContent={<MediaBreadcrumb ancestors={ancestors} current={currentFolder} />}
    >
      {hiddenInput}

      {canSync && (
        <DashboardButton
          onClick={onSync}
          disabled={isSyncing}
          leadingIcon={
            <ArrowsClockwiseIcon
              weight="duotone"
              className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
          }
          variant="neutral"
        >
          Sync
        </DashboardButton>
      )}

      <DashboardButton
        onClick={open}
        disabled={isUploading}
        leadingIcon={<PlusCircleIcon weight="duotone" className="size-3.5" />}
        variant="primary"
      >
        {isUploading ? mediaMessages.uploading : mediaMessages.upload}
      </DashboardButton>
    </PageHeader>
  );
}
