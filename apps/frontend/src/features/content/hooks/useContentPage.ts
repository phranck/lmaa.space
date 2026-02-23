import { api } from "@/lib/api.ts";
import type { ContentPage } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";

export function useContentPage(slug: string) {
  return useQuery({
    queryKey: ["content", slug],
    queryFn: () => api.get<ContentPage>(`/content/${slug}`),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
