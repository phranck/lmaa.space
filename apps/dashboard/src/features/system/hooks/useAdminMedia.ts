import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MediaAsset } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

export function useAdminMedia() {
  return useQuery({
    queryKey: ["media-admin"],
    queryFn: () => api.get<MediaAsset[]>("/admin/media"),
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
