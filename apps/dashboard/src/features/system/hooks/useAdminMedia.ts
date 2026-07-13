import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MEDIA_UPLOAD_MAX_BYTES, type MediaAsset } from "@lmaa/shared";

import { api, type UploadRequestOptions } from "@/lib/api.ts";

export interface MediaFileUpload extends UploadRequestOptions {
  displayName?: string;
  file: File;
  folderId?: number | null;
  overwrite?: boolean;
}

export interface MediaBundleUploadFile {
  file: File;
  relativePath: string;
}

export interface MediaBundleUpload extends UploadRequestOptions {
  name: string;
  files: MediaBundleUploadFile[];
  folderId?: number | null;
  overwrite?: boolean;
}

interface HlsBundleCompletePayload {
  files: Array<{ relativePath: string; sizeBytes: number }>;
  folderId?: number | null;
  name: string;
  overwrite?: boolean;
  sessionId: string;
}

const HLS_UPLOAD_CHUNK_TARGET_BYTES = Math.floor(MEDIA_UPLOAD_MAX_BYTES * 0.85);

function resolveFileUpload(input: File | MediaFileUpload): MediaFileUpload {
  return input instanceof File ? { file: input } : input;
}

function invalidateMediaQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["media-admin"] });
  qc.invalidateQueries({ queryKey: ["media", "folder-contents"] });
}

export function useAdminMedia() {
  return useQuery({
    queryKey: ["media-admin"],
    queryFn: () => api.get<MediaAsset[]>("/admin/media"),
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: File | MediaFileUpload) => {
      const { displayName, file, folderId, onProgress, onUploadComplete, overwrite } =
        resolveFileUpload(input);
      const formData = new FormData();
      formData.append("file", file);
      if (displayName) formData.append("displayName", displayName);
      if (folderId !== undefined && folderId !== null) {
        formData.append("folderId", String(folderId));
      }
      if (overwrite) formData.append("overwrite", "true");
      return api.upload<MediaAsset>("/admin/media", formData, {
        onProgress,
        onUploadComplete,
      });
    },
    onSuccess: () => invalidateMediaQueries(qc),
  });
}

export function useUploadHlsBundle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (bundle: MediaBundleUpload) => {
      const totalSize = bundle.files.reduce((sum, item) => sum + item.file.size, 0);
      if (totalSize > HLS_UPLOAD_CHUNK_TARGET_BYTES) {
        return uploadChunkedHlsBundle(bundle, totalSize);
      }

      const formData = new FormData();
      formData.append("name", bundle.name);
      if (bundle.folderId !== undefined && bundle.folderId !== null) {
        formData.append("folderId", String(bundle.folderId));
      }
      if (bundle.overwrite) formData.append("overwrite", "true");
      for (const item of bundle.files) {
        formData.append("files", item.file, item.file.name);
        formData.append("paths", item.relativePath);
      }
      return api.upload<MediaAsset>("/admin/media/bundles/hls", formData, {
        onProgress: bundle.onProgress,
        onUploadComplete: bundle.onUploadComplete,
      });
    },
    onSuccess: () => invalidateMediaQueries(qc),
  });
}

export function useRenameMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      displayName,
      alias,
      folderId,
    }: {
      id: number;
      displayName?: string;
      alias?: string | null;
      folderId?: number | null;
    }) => api.patch<MediaAsset>(`/admin/media/${id}`, { displayName, alias, folderId }),
    onSuccess: () => invalidateMediaQueries(qc),
  });
}

export function useSyncMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ created: number; updated: number; removed: number }>("/admin/media/sync"),
    onSuccess: () => invalidateMediaQueries(qc),
  });
}

export function useDeleteMediaAssets() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      Promise.all(ids.map((id) => api.delete<{ message: string }>(`/admin/media/${id}`))).then(
        () => ({ deleted: ids.length }),
      ),
    onSuccess: () => invalidateMediaQueries(qc),
  });
}

function createHlsUploadBatches(files: MediaBundleUploadFile[]) {
  const batches: MediaBundleUploadFile[][] = [];
  let currentBatch: MediaBundleUploadFile[] = [];
  let currentBatchSize = 0;

  for (const item of files) {
    if (
      currentBatch.length > 0 &&
      currentBatchSize + item.file.size > HLS_UPLOAD_CHUNK_TARGET_BYTES
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    currentBatch.push(item);
    currentBatchSize += item.file.size;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function uploadChunkedHlsBundle(
  bundle: MediaBundleUpload,
  totalSize: number,
): Promise<MediaAsset> {
  const sessionId = crypto.randomUUID();
  const batches = createHlsUploadBatches(bundle.files);
  let completedBytes = 0;

  await batches.reduce<Promise<void>>(async (previous, batch) => {
    await previous;
    const batchBytes = batch.reduce((sum, item) => sum + item.file.size, 0);
    const formData = new FormData();
    formData.append("sessionId", sessionId);

    for (const item of batch) {
      formData.append("files", item.file, item.file.name);
      formData.append("paths", item.relativePath);
    }

    await api.upload<{ uploaded: number }>("/admin/media/bundles/hls/chunks", formData, {
      onProgress: (progress) => {
        const loaded = completedBytes + progress.loaded;
        bundle.onProgress?.({
          loaded,
          total: totalSize,
          percent: Math.round((loaded / totalSize) * 100),
        });
      },
    });
    completedBytes += batchBytes;
  }, Promise.resolve());

  bundle.onUploadComplete?.();

  return api.post<MediaAsset>("/admin/media/bundles/hls/complete", {
    files: bundle.files.map((item) => ({
      relativePath: item.relativePath,
      sizeBytes: item.file.size,
    })),
    folderId: bundle.folderId,
    name: bundle.name,
    overwrite: bundle.overwrite,
    sessionId,
  } satisfies HlsBundleCompletePayload);
}
