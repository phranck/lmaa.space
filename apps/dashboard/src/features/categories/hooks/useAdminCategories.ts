import { api } from "@/lib/api.ts";
import type { Category } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Form & Image Types ───────────────────────────────────────────────────────

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
}

export interface CategoryImageState {
  previewUrl: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  pendingFile: File | null;
  pendingUnsplashUrl: string | null;
  deleted: boolean;
  loadError: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminCategories(enabled = true) {
  return useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
    enabled,
  });
}

export function useSaveCategory(categoryId: number | "new") {
  const qc = useQueryClient();
  const isNew = categoryId === "new";

  return useMutation({
    mutationFn: async ({
      form,
      image,
    }: {
      form: CategoryFormData;
      image: CategoryImageState;
    }) => {
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
      } else if (image.pendingUnsplashUrl) {
        await api.patch(`/admin/categories/${id}`, {
          imageUrl: image.pendingUnsplashUrl,
          imagePhotographer: image.photographer,
          imagePhotographerUrl: image.photographerUrl,
        });
      }

      return saved;
    },
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
