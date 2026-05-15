import { useRef, type DragEvent as ReactDragEvent } from "react";

import type { useI18n } from "@/context/I18nContext.tsx";
import type { MediaBundleUpload } from "@/features/system/hooks/useAdminMedia.ts";
import {
  collectDroppedHlsBundles,
  getFileSystemEntry,
} from "@/features/system/media/hls-upload-utils.ts";
import type { MediaUploadProgress } from "@/features/system/media/MediaUploadOverlay.tsx";

interface UseMediaDropZoneOptions {
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onActionError: (message: string | null) => void;
  onDragActiveChange: (active: boolean) => void;
  onUploadFiles: (files: File[]) => Promise<void>;
  onUploadBundles: (bundles: MediaBundleUpload[]) => Promise<void>;
  onUploadProgressChange: (progress: MediaUploadProgress | null) => void;
}

export function useMediaDropZone({
  mediaMessages,
  onActionError,
  onDragActiveChange,
  onUploadBundles,
  onUploadFiles,
  onUploadProgressChange,
}: UseMediaDropZoneOptions) {
  const dragDepthRef = useRef(0);

  function hasDraggedFiles(event: ReactDragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    onDragActiveChange(true);
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      onDragActiveChange(false);
    }
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    const { dataTransfer } = event;
    const droppedItems = Array.from(dataTransfer.items);
    const droppedFiles = Array.from(dataTransfer.files);
    const hasDirectoryEntry = droppedItems.some((item) => getFileSystemEntry(item)?.isDirectory);
    dragDepthRef.current = 0;
    onActionError(null);
    onDragActiveChange(false);
    onUploadProgressChange(
      hasDirectoryEntry
        ? {
            phase: "reading",
            name: mediaMessages.hlsBundleFallbackName,
            filesRead: 0,
          }
        : null,
    );

    void (async () => {
      try {
        const collection = await collectDroppedHlsBundles(droppedItems, (progress) => {
          onUploadProgressChange({
            phase: "reading",
            name: progress.name,
            filesRead: progress.filesRead,
            filesTotal: progress.filesTotal,
          });
        });

        if (collection.bundles.length > 0) {
          await onUploadBundles(collection.bundles);
          return;
        }

        if (collection.emptyDirectories.length > 0) {
          onActionError(
            mediaMessages.emptyFolderUpload.replace(
              "{name}",
              collection.emptyDirectories[0] ?? mediaMessages.hlsBundleFallbackName,
            ),
          );
          onUploadProgressChange(null);
          return;
        }

        if (
          collection.directoryCount > 0 ||
          (collection.unsupportedItemCount > 0 && droppedFiles.length === 0)
        ) {
          onActionError(mediaMessages.directoryUploadUnsupported);
          onUploadProgressChange(null);
          return;
        }

        await onUploadFiles(droppedFiles);
      } catch (error) {
        onActionError(error instanceof Error ? error.message : mediaMessages.uploadError);
        onUploadProgressChange(null);
      }
    })();
  }

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
