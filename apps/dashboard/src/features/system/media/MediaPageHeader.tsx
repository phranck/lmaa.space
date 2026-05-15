import {
  ArrowsClockwiseIcon,
  ListBulletsIcon,
  PlusCircleIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { useRef } from "react";

import { MEDIA_UPLOAD_ACCEPT } from "@lmaa/shared";

import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

export type MediaViewMode = "list" | "grid";

interface MediaPageHeaderProps {
  isSyncing: boolean;
  isUploading: boolean;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onSync: () => void;
  onUploadFiles: (files: FileList | null) => void;
  onViewModeChange: (viewMode: MediaViewMode) => void;
  userId: number | null | undefined;
  viewMode: MediaViewMode;
}

export function MediaPageHeader({
  isSyncing,
  isUploading,
  mediaMessages,
  onSync,
  onUploadFiles,
  onViewModeChange,
  userId,
  viewMode,
}: MediaPageHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <PageHeader title={mediaMessages.title}>
      <SegmentedControl
        value={viewMode}
        onChange={(value) => onViewModeChange(value as MediaViewMode)}
        storageKey={getSegmentedStorageKey(userId, "media:view")}
        options={[
          { value: "list", icon: <ListBulletsIcon weight="duotone" className="size-4" /> },
          { value: "grid", icon: <SquaresFourIcon weight="duotone" className="size-4" /> },
        ]}
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={MEDIA_UPLOAD_ACCEPT}
        onChange={(event) => {
          onUploadFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

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

      <DashboardButton
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        leadingIcon={<PlusCircleIcon weight="duotone" className="size-3.5" />}
        variant="primary"
      >
        {isUploading ? mediaMessages.uploading : mediaMessages.upload}
      </DashboardButton>
    </PageHeader>
  );
}
