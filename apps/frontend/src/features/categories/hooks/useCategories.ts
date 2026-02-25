import { api } from "@/lib/api.ts";
import type { Category, CategoryWithShops } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useShopStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<{ shopCount: number }>("/stats"),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ["categories", slug],
    queryFn: () => api.get<CategoryWithShops>(`/categories/${slug}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
