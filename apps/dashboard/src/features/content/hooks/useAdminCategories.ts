import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Category } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

// ─── Form & Image Types ───────────────────────────────────────────────────────

/**
 * Mutable category form fields used by the editor card.
 */
export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
}

/**
 * Full Unsplash photo data needed for the backend upsert + cache flow.
 */
export interface PendingUnsplashData {
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
}

/**
 * Client-side category image workflow state.
 */
export interface CategoryImageState {
  previewUrl: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  pendingFile: File | null;
  pendingUnsplashUrl: string | null;
  pendingUnsplashData: PendingUnsplashData | null;
  deleted: boolean;
  loadError: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Loads admin categories.
 *
 * @param enabled - Optional query toggle for conditional fetches.
 * @returns React Query result with category list.
 */
export function useAdminCategories(enabled = true) {
  return useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Saves a category (create or update) including image actions.
 *
 * Hidden behavior: image operations are sequenced after category save and
 * depend on `CategoryImageState` flags.
 *
 * @param categoryId - Existing id or `"new"` for creation mode.
 * @returns React Query mutation.
 */
export function useSaveCategory(categoryId: number | "new") {
  const qc = useQueryClient();
  const isNew = categoryId === "new";

  return useMutation({
    mutationFn: async ({ form, image }: { form: CategoryFormData; image: CategoryImageState }) => {
      let saved: Category;

      if (isNew) {
        saved = await api.post<Category>("/admin/categories", form);
      } else {
        saved = await api.patch<Category>(`/admin/categories/${categoryId}`, form);
      }

      const id = saved.id;

      if (image.deleted && !image.pendingFile && !image.pendingUnsplashUrl) {
        await api.delete(`/admin/categories/${id}/image`);
      } else if (image.pendingFile) {
        const fd = new FormData();
        fd.append("image", image.pendingFile);
        await api.upload(`/admin/categories/${id}/image`, fd);
      } else if (image.pendingUnsplashData) {
        await api.post(`/admin/categories/${id}/unsplash-image`, image.pendingUnsplashData);
      }

      return saved;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories-admin"] }),
  });
}

/**
 * Deletes a category and invalidates category queries.
 *
 * @returns React Query mutation for category deletion.
 */
export function useSetCategoryFocalPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, focalPointY }: { id: number; focalPointY: number }) =>
      api.patch<Category>(`/admin/categories/${id}/focal-point`, { focalPointY }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories-admin"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories-admin"] }),
  });
}
