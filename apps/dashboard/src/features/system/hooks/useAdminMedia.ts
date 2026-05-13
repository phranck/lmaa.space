import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MediaAsset } from "@lmaa/shared";

import { api, type UploadRequestOptions } from "@/lib/api.ts";

export interface MediaFileUpload extends UploadRequestOptions {
  file: File;
}

export interface MediaBundleUploadFile {
  file: File;
  relativePath: string;
}

export interface MediaBundleUpload extends UploadRequestOptions {
  name: string;
  files: MediaBundleUploadFile[];
}

function resolveFileUpload(input: File | MediaFileUpload): MediaFileUpload {
  return input instanceof File ? { file: input } : input;
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
      const { file, onProgress, onUploadComplete } = resolveFileUpload(input);
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<MediaAsset>("/admin/media", formData, {
        onProgress,
        onUploadComplete,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}

export function useUploadHlsBundle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (bundle: MediaBundleUpload) => {
      const formData = new FormData();
      formData.append("name", bundle.name);
      for (const item of bundle.files) {
        formData.append("files", item.file, item.file.name);
        formData.append("paths", item.relativePath);
      }
      return api.upload<MediaAsset>("/admin/media/bundles/hls", formData, {
        onProgress: bundle.onProgress,
        onUploadComplete: bundle.onUploadComplete,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}

export function useRenameMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      displayName,
      alias,
    }: {
      id: number;
      displayName: string;
      alias?: string | null;
    }) => api.patch<MediaAsset>(`/admin/media/${id}`, { displayName, alias }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}

export function useSyncMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<{ created: number; updated: number; removed: number }>("/admin/media/sync"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/media/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}
