import { api } from "@/lib/api.ts";
import type { Shop } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ShopFormData {
  name: string;
  url: string;
  description: string;
  categoryId: string;
  region: string;
  shipping: string;
}

export const EMPTY_SHOP_FORM: ShopFormData = {
  name: "",
  url: "",
  description: "",
  categoryId: "",
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
    mutationFn: (data: ShopFormData) => {
      const body = {
        ...data,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
      };
      return editId
        ? api.patch(`/admin/shops/${editId}`, body)
        : api.post("/admin/shops", body);
    },
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
