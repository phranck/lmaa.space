import { useRef, useState } from "react";

import type { MediaAsset } from "@lmaa/shared";
import { MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

import type { useI18n } from "@/context/I18nContext.tsx";
import {
  type MediaBundleUpload,
  useUploadHlsBundle,
  useUploadMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import { processMediaUploadQueue } from "@/features/system/media/media-upload-queue.ts";
import { formatBytes } from "@/features/system/media/media-utils.ts";
import type { UploadConflictState } from "@/features/system/media/MediaUploadConflictDialog.tsx";
import type { MediaUploadProgress } from "@/features/system/media/MediaUploadOverlay.tsx";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface UploadConflictResolution {
  displayName: string;
  overwrite: boolean;
}

interface UseMediaUploadWorkflowOptions {
  assets: MediaAsset[];
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onActionError: (message: string | null) => void;
  onUploadedAssetSelect: (asset: MediaAsset) => void;
}

function normalizeMediaAssetName(name: string) {
  return name.trim().toLowerCase();
}

function getUploadProgressValue(progress: MediaUploadProgress | null) {
  if (!progress) return null;
  if (progress.phase === "reading" && progress.filesTotal && progress.filesTotal > 0) {
    return Math.round(((progress.filesRead ?? 0) / progress.filesTotal) * 100);
  }
  if (progress.phase === "uploading" && progress.percent !== undefined) {
    return progress.percent;
  }
  if (progress.phase === "processing") {
    return 100;
  }
  return null;
}

export function useMediaUploadWorkflow({
  assets,
  locale,
  mediaMessages,
  onActionError,
  onUploadedAssetSelect,
}: UseMediaUploadWorkflowOptions) {
  const uploadMedia = useUploadMedia();
  const uploadHlsBundle = useUploadHlsBundle();
  const [uploadConflict, setUploadConflict] = useState<UploadConflictState | null>(null);
  const [uploadProgress, setUploadProgress] = useState<MediaUploadProgress | null>(null);
  const uploadConflictResolverRef = useRef<
    ((resolution: UploadConflictResolution | null) => void) | null
  >(null);

  const uploadProgressValue = getUploadProgressValue(uploadProgress);
  const uploadOverlayTitle = uploadProgress
    ? getUploadProgressTitle(uploadProgress)
    : mediaMessages.dropTitle;
  const uploadOverlayDetail = uploadProgress
    ? getUploadProgressDetail(uploadProgress)
    : mediaMessages.uploadHint;
  const uploadConflictDraftName = uploadConflict?.draftName.trim() ?? "";
  const uploadConflictDraftConflict = uploadConflict
    ? findMediaAssetNameConflict(uploadConflictDraftName)
    : null;
  const canUploadWithNewName =
    uploadConflict !== null && uploadConflictDraftName.length > 0 && !uploadConflictDraftConflict;

  function findMediaAssetNameConflict(name: string) {
    const normalized = normalizeMediaAssetName(name);
    if (!normalized) return null;
    return (
      assets.find((asset) => normalizeMediaAssetName(asset.displayName) === normalized) ?? null
    );
  }

  function getUploadProgressTitle(progress: MediaUploadProgress) {
    if (progress.phase === "reading") return mediaMessages.readingHlsFolder;
    if (progress.phase === "uploading") {
      return progress.filesTotal ? mediaMessages.uploadingHlsBundle : mediaMessages.uploadingFile;
    }
    return mediaMessages.processingUpload;
  }

  function getUploadProgressDetail(progress: MediaUploadProgress) {
    if (progress.phase === "reading" && progress.filesTotal !== undefined) {
      return mediaMessages.readingFilesProgress
        .replace("{read}", String(progress.filesRead ?? 0))
        .replace("{total}", String(progress.filesTotal));
    }

    if (progress.phase === "uploading") {
      const percent = progress.percent ?? getUploadProgressValue(progress);
      const size =
        progress.bytesTotal && progress.bytesTotal > 0
          ? ` · ${formatBytes(progress.bytesLoaded ?? 0, locale, { fixedFractionDigits: 1 })} / ${formatBytes(progress.bytesTotal, locale, { fixedFractionDigits: 1 })}`
          : "";
      return percent !== null
        ? mediaMessages.uploadProgress.replace("{percent}", String(percent)) + size
        : mediaMessages.uploadProgressUnknown + size;
    }

    return mediaMessages.processingUploadHint;
  }

  function resolvePendingUploadConflict(resolution: UploadConflictResolution | null) {
    uploadConflictResolverRef.current?.(resolution);
    uploadConflictResolverRef.current = null;
    setUploadConflict(null);
  }

  function resolveUploadNameConflict(name: string): Promise<UploadConflictResolution | null> {
    const requestedName = name.trim() || "file";
    const existingAsset = findMediaAssetNameConflict(requestedName);
    if (!existingAsset) {
      return Promise.resolve({ displayName: requestedName, overwrite: false });
    }

    return new Promise((resolve) => {
      uploadConflictResolverRef.current = resolve;
      setUploadConflict({
        draftName: requestedName,
        existingAsset,
        requestedName,
      });
    });
  }

  async function uploadMediaFile(file: File): Promise<MediaAsset | null> {
    const resolution = await resolveUploadNameConflict(file.name);
    if (!resolution) return null;

    setUploadProgress({
      phase: "uploading",
      name: resolution.displayName,
      bytesLoaded: 0,
      bytesTotal: file.size,
      percent: 0,
    });

    return uploadMedia.mutateAsync({
      displayName: resolution.displayName,
      file,
      overwrite: resolution.overwrite,
      onProgress: (progress) => {
        setUploadProgress({
          phase: "uploading",
          name: resolution.displayName,
          bytesLoaded: progress.loaded,
          bytesTotal: progress.total ?? file.size,
          percent: progress.percent,
        });
      },
      onUploadComplete: () => {
        setUploadProgress({
          phase: "processing",
          name: resolution.displayName,
          bytesLoaded: file.size,
          bytesTotal: file.size,
          percent: 100,
        });
      },
    });
  }

  async function uploadHlsMediaBundle(bundle: MediaBundleUpload): Promise<MediaAsset | null> {
    const resolution = await resolveUploadNameConflict(bundle.name);
    if (!resolution) return null;

    const bundleSize = bundle.files.reduce((sum, item) => sum + item.file.size, 0);
    const fileCount = bundle.files.length;
    setUploadProgress({
      phase: "uploading",
      name: resolution.displayName,
      filesTotal: fileCount,
      bytesLoaded: 0,
      bytesTotal: bundleSize,
      percent: 0,
    });

    return uploadHlsBundle.mutateAsync({
      ...bundle,
      name: resolution.displayName,
      overwrite: resolution.overwrite,
      onProgress: (progress) => {
        setUploadProgress({
          phase: "uploading",
          name: resolution.displayName,
          filesTotal: fileCount,
          bytesLoaded: progress.loaded,
          bytesTotal: progress.total ?? bundleSize,
          percent: progress.percent,
        });
      },
      onUploadComplete: () => {
        setUploadProgress({
          phase: "processing",
          name: resolution.displayName,
          filesTotal: fileCount,
          bytesLoaded: bundleSize,
          bytesTotal: bundleSize,
          percent: 100,
        });
      },
    });
  }

  async function handleUpload(files: FileList | File[] | null) {
    const fileArray = Array.from(files ?? []);
    if (fileArray.length === 0) return;

    onActionError(null);
    const oversizedFile = fileArray.find((file) => file.size > MEDIA_UPLOAD_MAX_BYTES);
    if (oversizedFile) {
      onActionError(
        mediaMessages.uploadTooLarge
          .replace("{name}", oversizedFile.name)
          .replace("{max}", MEDIA_UPLOAD_MAX_LABEL),
      );
      return;
    }

    try {
      const result = await processMediaUploadQueue(fileArray, uploadMediaFile);

      if (result.last) {
        onUploadedAssetSelect(result.last);
      }
    } catch (error) {
      onActionError(error instanceof Error ? error.message : mediaMessages.uploadError);
    } finally {
      setUploadProgress(null);
    }
  }

  async function handleUploadBundles(bundles: MediaBundleUpload[]) {
    if (bundles.length === 0) return;

    onActionError(null);

    const oversizedBundle = bundles.find((bundle) =>
      bundle.files.some((item) => item.file.size > MEDIA_UPLOAD_MAX_BYTES),
    );
    const oversizedBundleFile = oversizedBundle?.files.find(
      (item) => item.file.size > MEDIA_UPLOAD_MAX_BYTES,
    );

    if (oversizedBundle) {
      onActionError(
        mediaMessages.uploadTooLarge
          .replace("{name}", oversizedBundleFile?.relativePath ?? oversizedBundle.name)
          .replace("{max}", MEDIA_UPLOAD_MAX_LABEL),
      );
      return;
    }

    try {
      const result = await processMediaUploadQueue(bundles, uploadHlsMediaBundle);

      if (result.last) {
        onUploadedAssetSelect(result.last);
      }
    } catch (error) {
      onActionError(error instanceof Error ? error.message : mediaMessages.uploadError);
    } finally {
      setUploadProgress(null);
    }
  }

  function handleUploadConflictDraftNameChange(nextName: string) {
    setUploadConflict((current) => (current ? { ...current, draftName: nextName } : current));
  }

  function handleUploadConflictOverwrite() {
    if (!uploadConflict) return;
    resolvePendingUploadConflict({
      displayName: uploadConflict.requestedName,
      overwrite: true,
    });
  }

  function handleUploadConflictRename() {
    if (!canUploadWithNewName) return;
    resolvePendingUploadConflict({
      displayName: uploadConflictDraftName,
      overwrite: false,
    });
  }

  return {
    canUploadWithNewName,
    handleUpload,
    handleUploadBundles,
    handleUploadConflictCancel: () => resolvePendingUploadConflict(null),
    handleUploadConflictDraftNameChange,
    handleUploadConflictOverwrite,
    handleUploadConflictRename,
    handleUploadProgressChange: setUploadProgress,
    isUploading: uploadMedia.isPending || uploadHlsBundle.isPending,
    uploadConflict,
    uploadConflictDraftConflict,
    uploadConflictDraftName,
    uploadOverlayDetail,
    uploadOverlayTitle,
    uploadProgress,
    uploadProgressValue,
  };
}
