import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MediaAsset } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

export interface UnsplashCacheMeta {
  unsplashId: string;
  width: number | null;
  height: number | null;
  color: string | null;
  blurHash: string | null;
  description: string | null;
  altDescription: string | null;
  likes: number | null;
  photographerName: string;
  photographerUrl: string;
  locationCity: string | null;
  locationCountry: string | null;
  createdAtUnsplash: string | null;
}

export interface UnsplashCacheItem {
  unsplashImageId: number;
  type: "hero" | "categorie";
  url: string;
  sizeBytes: number;
  unsplash: UnsplashCacheMeta | null;
}

export function useAdminMedia() {
  return useQuery({
    queryKey: ["media-admin"],
    queryFn: () => api.get<MediaAsset[]>("/admin/media"),
  });
}

export function useUnsplashCacheMedia() {
  return useQuery({
    queryKey: ["media-cache"],
    queryFn: () => api.get<UnsplashCacheItem[]>("/admin/media/cache"),
  });
}

export function useRefetchUnsplashMeta() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ type, unsplashId }: { type: "hero" | "categorie"; unsplashId: string }) =>
      api.post<{ updated: boolean }>(`/admin/media/cache/refetch/${type}/${unsplashId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-cache"] });
    },
  });
}

export function usePurgeUnsplashCache() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<{ deleted: number }>("/admin/media/cache"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-cache"] });
    },
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<MediaAsset>("/admin/media", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}

export function useRenameMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, displayName, alias }: { id: number; displayName: string; alias?: string | null }) =>
      api.patch<MediaAsset>(`/admin/media/${id}`, { displayName, alias }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-admin"] });
    },
  });
}

export function useSyncMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ created: number; updated: number; removed: number }>("/admin/media/sync"),
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
