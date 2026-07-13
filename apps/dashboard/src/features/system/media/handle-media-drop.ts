import type { useI18n } from "@/context/I18nContext.tsx";
import type { MediaBundleUpload } from "@/features/system/hooks/useAdminMedia.ts";
import {
  collectDroppedHlsBundles,
  type DroppedMediaDirectoryUpload,
  getFileSystemEntry,
  isHiddenOrSystemEntryName,
} from "@/features/system/media/hls-upload-utils.ts";
import type { MediaUploadProgress } from "@/features/system/media/MediaUploadOverlay.tsx";

interface HandleMediaDropOptions {
  dataTransfer: DataTransfer;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onActionError: (message: string | null) => void;
  onUploadBundles: (bundles: MediaBundleUpload[]) => Promise<void>;
  onUploadDirectory: (directory: DroppedMediaDirectoryUpload) => Promise<unknown>;
  onUploadFiles: (files: File[]) => Promise<unknown>;
  onUploadProgressChange: (progress: MediaUploadProgress | null) => void;
}

export function hasDraggedFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes("Files");
}

export async function handleMediaDrop({
  dataTransfer,
  mediaMessages,
  onActionError,
  onUploadBundles,
  onUploadDirectory,
  onUploadFiles,
  onUploadProgressChange,
}: HandleMediaDropOptions) {
  const droppedItems = Array.from(dataTransfer.items);
  const droppedFiles = Array.from(dataTransfer.files).filter(
    (file) => !isHiddenOrSystemEntryName(file.name),
  );
  const hasDirectoryEntry = droppedItems.some((item) => getFileSystemEntry(item)?.isDirectory);

  onActionError(null);
  onUploadProgressChange(
    hasDirectoryEntry
      ? {
          phase: "reading",
          name: mediaMessages.folderUploadFallbackName,
          filesRead: 0,
        }
      : null,
  );

  try {
    const collection = await collectDroppedHlsBundles(droppedItems, (progress) => {
      onUploadProgressChange({
        phase: "reading",
        name: progress.name,
        filesRead: progress.filesRead,
        filesTotal: progress.filesTotal,
      });
    });

    if (collection.bundles.length > 0 || collection.directories.length > 0) {
      await onUploadBundles(collection.bundles);
      await Promise.all(collection.directories.map((directory) => onUploadDirectory(directory)));
      return;
    }

    if (collection.emptyDirectories.length > 0) {
      onActionError(
        mediaMessages.emptyFolderUpload.replace(
          "{name}",
          collection.emptyDirectories[0] ?? mediaMessages.folderUploadFallbackName,
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
}
