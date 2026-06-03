import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api.ts";

export interface HeroImage {
  id: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
  isSelected: boolean;
  isSocialPreview: boolean;
  focalPointY: number;
  sortOrder: number;
  createdAt: string;
}

const QUERY_KEY = ["hero-images"] as const;

export function useHeroImages() {
  return useQuery<HeroImage[]>({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<HeroImage[]>("/admin/hero-images"),
  });
}

export function useAddHeroImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      unsplashId: string;
      url: string;
      urlSmall: string;
      photographer: string;
      photographerUrl: string;
      downloadLocation: string;
      width: number;
      height: number;
      color: string | null;
      blurHash: string | null;
      description: string | null;
      altDescription: string | null;
      likes: number;
      createdAt: string;
    }) => api.post<HeroImage>("/admin/hero-images", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteHeroImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/hero-images/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useSetHeroImageFocalPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, focalPointY }: { id: number; focalPointY: number }) =>
      api.patch<HeroImage>(`/admin/hero-images/${id}/focal-point`, { focalPointY }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useToggleHeroImageSelected() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, selected }: { id: number; selected: boolean }) =>
      api.patch<HeroImage>(`/admin/hero-images/${id}/select`, { selected }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useToggleHeroImageSocialPreview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, selected }: { id: number; selected: boolean }) =>
      api.patch<HeroImage>(`/admin/hero-images/${id}/social-preview`, { selected }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

const ROTATION_QUERY_KEY = ["hero-rotation"] as const;
const INTERVAL_QUERY_KEY = ["hero-rotation-interval"] as const;

export function useHeroRotation() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ROTATION_QUERY_KEY,
    queryFn: () => api.get<{ enabled: boolean }>("/admin/hero-rotation"),
  });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put<{ enabled: boolean }>("/admin/hero-rotation", { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROTATION_QUERY_KEY });
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
  return {
    enabled: query.data?.enabled ?? true,
    isLoading: query.isLoading,
    setEnabled: mutation.mutate,
    isPending: mutation.isPending,
  };
}

export function useHeroRotationInterval() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: INTERVAL_QUERY_KEY,
    queryFn: () => api.get<{ interval: number }>("/admin/hero-rotation-interval"),
  });
  const mutation = useMutation({
    mutationFn: (interval: number) =>
      api.put<{ interval: number }>("/admin/hero-rotation-interval", { interval }),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTERVAL_QUERY_KEY }),
  });
  return {
    interval: query.data?.interval ?? 3,
    isLoading: query.isLoading,
    save: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
