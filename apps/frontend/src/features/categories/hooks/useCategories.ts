import { api } from "@/lib/api.ts";
import type { Category, CategoryWithShops } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: 10 * 60 * 1000,
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
