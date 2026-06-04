import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SocialPreviewComposition,
  SocialPreviewFormat,
  SocialPreviewImageEntry,
  SocialPreviewProjectEntry,
} from "@lmaa/contracts";
import type { MediaAsset } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

const QUERY_KEY = ["social-preview-images"] as const;
const PROJECT_QUERY_KEY = ["social-preview-projects"] as const;

export function useSocialPreviewProjects() {
  return useQuery<SocialPreviewProjectEntry[]>({
    queryKey: PROJECT_QUERY_KEY,
    queryFn: () => api.get<SocialPreviewProjectEntry[]>("/admin/social-preview-projects"),
  });
}

export function useSocialPreviewImages() {
  return useQuery<SocialPreviewImageEntry[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<SocialPreviewImageEntry[]>("/admin/social-preview-images"),
  });
}

export function useCreateSocialPreviewProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; composition: SocialPreviewComposition }) =>
      api.post<SocialPreviewProjectEntry>("/admin/social-preview-projects", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_QUERY_KEY }),
  });
}

export function useUpdateSocialPreviewProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; composition?: SocialPreviewComposition };
    }) => api.patch<SocialPreviewProjectEntry>(`/admin/social-preview-projects/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_QUERY_KEY }),
  });
}

export function useDeleteSocialPreviewProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-preview-projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_QUERY_KEY }),
  });
}

export function useUploadSocialPreviewAsset() {
  return useMutation({
    mutationFn: ({
      blob,
      name,
      overwrite = true,
    }: {
      blob: Blob;
      name: string;
      overwrite?: boolean;
    }) => {
      const extension =
        blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
      const safeName = name.trim() || "Social Media Preview";
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type });
      const formData = new FormData();
      formData.set("file", file);
      formData.set("displayName", safeName);
      formData.set("overwrite", overwrite ? "true" : "false");
      return api.upload<MediaAsset>("/admin/social-preview-assets", formData);
    },
  });
}

export function useCreateSocialPreviewImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      imageUrl: string;
      mediaAssetId: number | null;
      composition: SocialPreviewComposition;
      width: number;
      height: number;
      format: SocialPreviewFormat;
      quality: number;
      sizeBytes: number;
      activate?: boolean;
    }) => api.post<SocialPreviewImageEntry>("/admin/social-preview-images", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useSetActiveSocialPreviewImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.patch<SocialPreviewImageEntry>(`/admin/social-preview-images/${id}/active`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteSocialPreviewImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-preview-images/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
