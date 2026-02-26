import type { ShopDeleteMode } from "@/features/shops/ShopDeleteReasonCard.tsx";
import { api } from "@/lib/api.ts";
import type { Shop, ShopSummary } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type { ShopEditFormValue };

export function useAdminShops(visibility?: "public" | "onhold" | "deleted") {
  return useQuery({
    queryKey: ["shops-admin", visibility],
    queryFn: () =>
      api.get<ShopSummary[]>(`/admin/shops${visibility ? `?visibility=${visibility}` : ""}`),
  });
}

export function useSetShopVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visibility }: { id: number; visibility: "public" | "onhold" }) =>
      api.patch(`/admin/shops/${id}/visibility`, { visibility }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

export function useAdminShop(id: number | null) {
  return useQuery({
    queryKey: ["shop", id],
    queryFn: () => api.get<Shop>(`/admin/shops/${id}`),
    enabled: id !== null,
  });
}

export function useSaveShop(editId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShopEditFormValue) =>
      editId ? api.patch(`/admin/shops/${editId}`, data) : api.post("/admin/shops", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}

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

export function useFetchPreviewImage() {
  return useMutation({
    mutationFn: (url: string) =>
      api.post<{ ogImage: string | null }>("/admin/preview-image", { url }),
  });
}

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
