import { api } from "@/lib/api.ts";
import type { Shop } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type { ShopEditFormValue };

export function useAdminShops() {
  return useQuery({
    queryKey: ["shops-admin"],
    queryFn: () => api.get<Shop[]>("/admin/shops"),
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
    mutationFn: (id: number) => api.delete(`/admin/shops/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shops-admin"] }),
  });
}
