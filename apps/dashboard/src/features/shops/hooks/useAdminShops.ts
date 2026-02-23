import { api } from "@/lib/api.ts";
import type { Shop } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ShopFormData {
  name: string;
  url: string;
  description: string;
  categoryIds: number[];
  region: string;
  shipping: string;
}

export const EMPTY_SHOP_FORM: ShopFormData = {
  name: "",
  url: "",
  description: "",
  categoryIds: [],
  region: "",
  shipping: "",
};

export function useAdminShops() {
  return useQuery({
    queryKey: ["shops-admin"],
    queryFn: () => api.get<Shop[]>("/admin/shops"),
  });
}

export function useSaveShop(editId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShopFormData) =>
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
