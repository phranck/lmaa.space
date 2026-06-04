import { useRef, useState } from "react";

import type { MediaAsset } from "@lmaa/shared";
import { MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

import type { useI18n } from "@/context/I18nContext.tsx";
import {
  type MediaBundleUpload,
  useUploadHlsBundle,
  useUploadMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import { isHiddenOrSystemEntryName } from "@/features/system/media/hls-upload-utils.ts";
import { processMediaUploadQueue } from "@/features/system/media/media-upload-queue.ts";
import { formatBytes } from "@/features/system/media/media-utils.ts";
import type { UploadConflictState } from "@/features/system/media/MediaUploadConflictDialog.tsx";
import type { MediaUploadProgress } from "@/features/system/media/MediaUploadOverlay.tsx";
import type { DashboardLocale } from "@/i18n/messages.ts";

interface UploadConflictResolution {
  displayName: string;
  overwrite: boolean;
}

type UploadConflictApplyAllResolution = "rename" | "overwrite";

interface UseMediaUploadWorkflowOptions {
  assets: MediaAsset[];
  locale: DashboardLocale;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onActionError: (message: string | null) => void;
  onUploadedAsset?: (asset: MediaAsset) => Promise<void> | void;
  onUploadedAssetSelect: (asset: MediaAsset) => void;
  targetFolderId: number | null;
}

interface MediaUploadOptions {
  selectLastAsset?: boolean;
  targetFolderId?: number | null;
}

interface MediaUploadWorkflowResult {
  last: MediaAsset | null;
  ok: boolean;
}

interface MediaUploadBatchProgress {
  completedBytes: number;
  completedFiles: number;
  totalBytes: number;
  totalFiles: number;
}

function normalizeMediaAssetName(name: string) {
  return name.trim().toLowerCase();
}

function getUploadPercent(loaded: number, total: number) {
  return total > 0 ? Math.round((loaded / total) * 100) : null;
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
  onUploadedAsset,
  onUploadedAssetSelect,
  targetFolderId,
}: UseMediaUploadWorkflowOptions) {
  const uploadMedia = useUploadMedia();
  const uploadHlsBundle = useUploadHlsBundle();
  const [uploadConflict, setUploadConflict] = useState<UploadConflictState | null>(null);
  const [uploadConflictApplyToAll, setUploadConflictApplyToAll] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<MediaUploadProgress | null>(null);
  const uploadBatchSizeRef = useRef(0);
  const uploadConflictApplyAllRef = useRef<UploadConflictApplyAllResolution | null>(null);
  const uploadConflictResolverRef = useRef<
    ((resolution: UploadConflictResolution | null) => void) | null
  >(null);
  const reservedUploadNamesRef = useRef<Set<string> | null>(null);
  if (reservedUploadNamesRef.current === null) {
    reservedUploadNamesRef.current = new Set();
  }
  function getReservedUploadNames() {
    reservedUploadNamesRef.current ??= new Set();
    return reservedUploadNamesRef.current;
  }

  const uploadProgressValue = getUploadProgressValue(uploadProgress);
  const uploadOverlayTitle = uploadProgress
    ? getUploadProgressTitle(uploadProgress)
    : mediaMessages.dropTitle;
  const uploadOverlayDetail = uploadProgress
    ? getUploadProgressDetail(uploadProgress)
    : mediaMessages.uploadHint;
  const uploadConflictDraftName = uploadConflict?.draftName.trim() ?? "";
  const uploadConflictDraftConflict = uploadConflict ? getUploadNameConflict() : null;
  const canUploadWithNewName =
    uploadConflict !== null && uploadConflictDraftName.length > 0 && !uploadConflictDraftConflict;

  function findMediaAssetNameConflict(name: string) {
    const normalized = normalizeMediaAssetName(name);
    if (!normalized) return null;
    return (
      assets.find((asset) => normalizeMediaAssetName(asset.displayName) === normalized) ?? null
    );
  }

  function isUploadNameUnavailable(name: string) {
    const normalized = normalizeMediaAssetName(name);
    if (!normalized) return true;
    return Boolean(findMediaAssetNameConflict(name) || getReservedUploadNames().has(normalized));
  }

  function reserveUploadName(name: string) {
    const normalized = normalizeMediaAssetName(name);
    if (normalized) {
      getReservedUploadNames().add(normalized);
    }
  }

  function getUploadNameConflict() {
    const existingAsset = findMediaAssetNameConflict(uploadConflictDraftName);
    if (existingAsset) return existingAsset;
    const normalized = normalizeMediaAssetName(uploadConflictDraftName);
    if (normalized && getReservedUploadNames().has(normalized)) {
      return uploadConflict?.existingAsset ?? null;
    }
    return null;
  }

  function getAvailableUploadName(name: string) {
    const requestedName = name.trim() || "file";
    if (!isUploadNameUnavailable(requestedName)) return requestedName;

    const extensionStart = requestedName.lastIndexOf(".");
    const hasExtension = extensionStart > 0;
    const basename = hasExtension ? requestedName.slice(0, extensionStart) : requestedName;
    const extension = hasExtension ? requestedName.slice(extensionStart) : "";
    let suffix = 2;
    let candidate = `${basename} ${suffix}${extension}`;

    while (isUploadNameUnavailable(candidate)) {
      suffix += 1;
      candidate = `${basename} ${suffix}${extension}`;
    }

    return candidate;
  }

  function getUploadProgressTitle(progress: MediaUploadProgress) {
    if (progress.phase === "reading") return mediaMessages.readingFolder;
    if (progress.phase === "uploading") {
      return progress.filesTotal && progress.filesUploaded === undefined
        ? mediaMessages.uploadingHlsBundle
        : mediaMessages.uploadingFile;
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
      const files =
        progress.filesUploaded !== undefined && progress.filesTotal !== undefined
          ? ` · ${mediaMessages.uploadingFilesProgress
              .replace("{uploaded}", String(progress.filesUploaded))
              .replace("{total}", String(progress.filesTotal))}`
          : "";
      const size =
        progress.bytesTotal && progress.bytesTotal > 0
          ? ` · ${formatBytes(progress.bytesLoaded ?? 0, locale, { fixedFractionDigits: 1 })} / ${formatBytes(progress.bytesTotal, locale, { fixedFractionDigits: 1 })}`
          : "";
      return percent !== null
        ? mediaMessages.uploadProgress.replace("{percent}", String(percent)) + files + size
        : mediaMessages.uploadProgressUnknown + files + size;
    }

    return mediaMessages.processingUploadHint;
  }

  function resolvePendingUploadConflict(resolution: UploadConflictResolution | null) {
    if (resolution) {
      if (uploadConflictApplyToAll) {
        uploadConflictApplyAllRef.current = resolution.overwrite ? "overwrite" : "rename";
      }
      if (!resolution.overwrite) {
        reserveUploadName(resolution.displayName);
      }
    }

    uploadConflictResolverRef.current?.(resolution);
    uploadConflictResolverRef.current = null;
    setUploadConflict(null);
    setUploadConflictApplyToAll(false);
  }

  function resolveUploadNameConflict(name: string): Promise<UploadConflictResolution | null> {
    const requestedName = name.trim() || "file";
    const existingAsset = findMediaAssetNameConflict(requestedName);
    if (!existingAsset) {
      reserveUploadName(requestedName);
      return Promise.resolve({ displayName: requestedName, overwrite: false });
    }

    const applyAllResolution = uploadConflictApplyAllRef.current;
    if (applyAllResolution === "overwrite") {
      return Promise.resolve({ displayName: requestedName, overwrite: true });
    }
    if (applyAllResolution === "rename") {
      const displayName = getAvailableUploadName(requestedName);
      reserveUploadName(displayName);
      return Promise.resolve({ displayName, overwrite: false });
    }

    return new Promise((resolve) => {
      uploadConflictResolverRef.current = resolve;
      setUploadConflictApplyToAll(false);
      setUploadConflict({
        draftName: requestedName,
        existingAsset,
        requestedName,
      });
    });
  }

  async function uploadMediaFile({
    batch,
    destinationFolderId,
    file,
  }: {
    batch?: MediaUploadBatchProgress;
    destinationFolderId: number | null;
    file: File;
  }): Promise<MediaAsset | null> {
    const resolution = await resolveUploadNameConflict(file.name);
    if (!resolution) return null;

    const isBatchUpload = batch !== undefined && batch.totalFiles > 1;
    const totalBytes = batch?.totalBytes ?? file.size;
    const completedBytes = batch?.completedBytes ?? 0;
    const completedFiles = batch?.completedFiles ?? 0;
    const filesTotal = isBatchUpload ? batch.totalFiles : undefined;

    setUploadProgress({
      phase: "uploading",
      name: resolution.displayName,
      filesTotal,
      filesUploaded: isBatchUpload ? completedFiles : undefined,
      bytesLoaded: completedBytes,
      bytesTotal: totalBytes,
      percent: getUploadPercent(completedBytes, totalBytes),
    });

    const asset = await uploadMedia.mutateAsync({
      displayName: resolution.displayName,
      file,
      folderId: destinationFolderId,
      overwrite: resolution.overwrite,
      onProgress: (progress) => {
        const loaded = completedBytes + progress.loaded;
        setUploadProgress({
          phase: "uploading",
          name: resolution.displayName,
          filesTotal,
          filesUploaded: isBatchUpload ? completedFiles : undefined,
          bytesLoaded: loaded,
          bytesTotal: totalBytes,
          percent: getUploadPercent(loaded, totalBytes) ?? progress.percent,
        });
      },
      onUploadComplete: () => {
        const loaded = completedBytes + file.size;
        const uploadedFiles = completedFiles + 1;
        setUploadProgress({
          phase: isBatchUpload && uploadedFiles < batch.totalFiles ? "uploading" : "processing",
          name: resolution.displayName,
          filesTotal,
          filesUploaded: isBatchUpload ? uploadedFiles : undefined,
          bytesLoaded: loaded,
          bytesTotal: totalBytes,
          percent: getUploadPercent(loaded, totalBytes),
        });
      },
    });
    await onUploadedAsset?.(asset);
    return asset;
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

    const asset = await uploadHlsBundle.mutateAsync({
      ...bundle,
      name: resolution.displayName,
      folderId: targetFolderId,
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
    await onUploadedAsset?.(asset);
    return asset;
  }

  async function handleUpload(
    files: FileList | File[] | null,
    options: MediaUploadOptions = {},
  ): Promise<MediaUploadWorkflowResult> {
    const fileArray = Array.from(files ?? []).filter(
      (file) => !isHiddenOrSystemEntryName(file.name),
    );
    if (fileArray.length === 0) return { last: null, ok: false };
    const destinationFolderId = options.targetFolderId ?? targetFolderId;

    onActionError(null);
    const oversizedFile = fileArray.find((file) => file.size > MEDIA_UPLOAD_MAX_BYTES);
    if (oversizedFile) {
      onActionError(
        mediaMessages.uploadTooLarge
          .replace("{name}", oversizedFile.name)
          .replace("{max}", MEDIA_UPLOAD_MAX_LABEL),
      );
      return { last: null, ok: false };
    }

    try {
      uploadBatchSizeRef.current = fileArray.length;
      uploadConflictApplyAllRef.current = null;
      reservedUploadNamesRef.current = new Set();
      const batch: MediaUploadBatchProgress = {
        completedBytes: 0,
        completedFiles: 0,
        totalBytes: fileArray.reduce((sum, file) => sum + file.size, 0),
        totalFiles: fileArray.length,
      };

      const result = await processMediaUploadQueue(fileArray, async (file) => {
        const asset = await uploadMediaFile({ batch, destinationFolderId, file });
        if (asset) {
          batch.completedBytes += file.size;
          batch.completedFiles += 1;
        }
        return asset;
      });

      if (result.last && options.selectLastAsset !== false) {
        onUploadedAssetSelect(result.last);
      }
      return { last: result.last, ok: !result.cancelled };
    } catch (error) {
      onActionError(error instanceof Error ? error.message : mediaMessages.uploadError);
      return { last: null, ok: false };
    } finally {
      uploadBatchSizeRef.current = 0;
      uploadConflictApplyAllRef.current = null;
      reservedUploadNamesRef.current = new Set();
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
      uploadBatchSizeRef.current = bundles.length;
      uploadConflictApplyAllRef.current = null;
      reservedUploadNamesRef.current = new Set();

      const result = await processMediaUploadQueue(bundles, uploadHlsMediaBundle);

      if (result.last) {
        onUploadedAssetSelect(result.last);
      }
    } catch (error) {
      onActionError(error instanceof Error ? error.message : mediaMessages.uploadError);
    } finally {
      uploadBatchSizeRef.current = 0;
      uploadConflictApplyAllRef.current = null;
      reservedUploadNamesRef.current = new Set();
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
    handleUploadConflictApplyToAllChange: setUploadConflictApplyToAll,
    handleUploadConflictCancel: () => resolvePendingUploadConflict(null),
    handleUploadConflictDraftNameChange,
    handleUploadConflictOverwrite,
    handleUploadConflictRename,
    handleUploadProgressChange: setUploadProgress,
    isUploading: uploadMedia.isPending || uploadHlsBundle.isPending,
    uploadConflict,
    uploadConflictApplyToAll,
    uploadConflictDraftConflict,
    uploadConflictDraftName,
    uploadConflictShowApplyToAll: uploadBatchSizeRef.current > 1,
    uploadOverlayDetail,
    uploadOverlayTitle,
    uploadProgress,
    uploadProgressValue,
  };
}
