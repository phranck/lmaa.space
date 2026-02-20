import { useQuery } from "@tanstack/react-query";
import type { Category } from "@dein-shop/shared";
import { api } from "../../../lib/api.ts";

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
    queryFn: () => api.get<Category & { shops: unknown[] }>(`/categories/${slug}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
