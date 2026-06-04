import { type DragEvent as ReactDragEvent, useRef } from "react";

import type { useI18n } from "@/context/I18nContext.tsx";
import type { MediaBundleUpload } from "@/features/system/hooks/useAdminMedia.ts";
import { handleMediaDrop, hasDraggedFiles } from "@/features/system/media/handle-media-drop.ts";
import type { DroppedMediaDirectoryUpload } from "@/features/system/media/hls-upload-utils.ts";
import type { MediaUploadProgress } from "@/features/system/media/MediaUploadOverlay.tsx";

interface UseMediaDropZoneOptions {
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onActionError: (message: string | null) => void;
  onDragActiveChange: (active: boolean) => void;
  onUploadFiles: (files: File[]) => Promise<unknown>;
  onUploadBundles: (bundles: MediaBundleUpload[]) => Promise<void>;
  onUploadDirectory: (directory: DroppedMediaDirectoryUpload) => Promise<void>;
  onUploadProgressChange: (progress: MediaUploadProgress | null) => void;
}

function handleMediaDragOver(event: ReactDragEvent<HTMLDivElement>) {
  if (!hasDraggedFiles(event.dataTransfer)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

export function useMediaDropZone({
  mediaMessages,
  onActionError,
  onDragActiveChange,
  onUploadBundles,
  onUploadDirectory,
  onUploadFiles,
  onUploadProgressChange,
}: UseMediaDropZoneOptions) {
  const dragDepthRef = useRef(0);

  function handleDragEnter(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    onDragActiveChange(true);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      onDragActiveChange(false);
    }
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    onDragActiveChange(false);

    void (async () => {
      await handleMediaDrop({
        dataTransfer: event.dataTransfer,
        mediaMessages,
        onActionError,
        onUploadBundles,
        onUploadDirectory,
        onUploadFiles,
        onUploadProgressChange,
      });
    })();
  }

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver: handleMediaDragOver,
    handleDrop,
  };
}
