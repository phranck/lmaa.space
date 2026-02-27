import type { ShopDeleteMode } from "@/features/shops/ShopDeleteReasonCard.tsx";
import { api } from "@/lib/api.ts";
import type { Shop, ShopMutableVisibility, ShopSummary, ShopVisibility } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Re-exported form value type used by shop editor views.
 */
export type { ShopEditFormValue };

/**
 * Loads admin shop summaries, optionally filtered by visibility.
 *
 * @param visibility - Optional visibility filter.
 * @returns React Query result with shop rows.
 */
export function useAdminShops(visibility?: ShopVisibility) {
  return useQuery({
    queryKey: ["shops-admin", visibility],
    queryFn: () =>
      api.get<ShopSummary[]>(`/admin/shops${visibility ? `?visibility=${visibility}` : ""}`),
  });
}

/**
 * Updates visibility (`public`/`onhold`) for one shop.
 *
 * @returns React Query mutation for visibility updates.
 */
export function useSetShopVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visibility }: { id: number; visibility: ShopMutableVisibility }) =>
      api.patch(`/admin/shops/${id}/visibility`, { visibility }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

/**
 * Loads one shop detail for edit mode.
 *
 * @param id - Shop id or `null` to disable fetching.
 * @returns React Query result with shop detail.
 */
export function useAdminShop(id: number | null) {
  return useQuery({
    queryKey: ["shop", id],
    queryFn: () => api.get<Shop>(`/admin/shops/${id}`),
    enabled: id !== null,
  });
}

/**
 * Creates or updates a shop depending on presence of `editId`.
 *
 * @param editId - Existing shop id or `null` for create mode.
 * @returns React Query mutation for save operations.
 */
export function useSaveShop(editId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShopEditFormValue) =>
      editId ? api.patch(`/admin/shops/${editId}`, data) : api.post("/admin/shops", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

/**
 * Deletes or soft-deletes a shop with optional reason metadata.
 *
 * @returns React Query mutation.
 */
export function useDeleteShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      wasReported,
      mode,
    }: { id: number; reason?: string; wasReported?: boolean; mode?: ShopDeleteMode }) =>
      api.delete(`/admin/shops/${id}`, {
        reason: reason ?? null,
        wasReported: wasReported ?? false,
        mode: mode ?? "mark_deleted",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

/**
 * Requests a preview OG image URL for an arbitrary shop URL.
 *
 * @returns React Query mutation returning preview image data.
 */
export function useFetchPreviewImage() {
  return useMutation({
    mutationFn: (url: string) =>
      api.post<{ ogImage: string | null }>("/admin/preview-image", { url }),
  });
}

/**
 * Refetches/stores OG image for an existing shop.
 *
 * @param shopId - Shop id.
 * @returns React Query mutation.
 */
export function useRefetchShopImage(shopId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ogImage: string | null }>(`/admin/shops/${shopId}/refetch-image`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}
