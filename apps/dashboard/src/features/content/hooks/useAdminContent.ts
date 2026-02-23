import { api } from "@/lib/api.ts";
import type { ContentPage } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminContentPage(slug: string) {
  return useQuery({
    queryKey: ["content-admin", slug],
    queryFn: () => api.get<ContentPage>(`/admin/content/${slug}`),
    enabled: !!slug,
  });
}

export function useSaveContentPage(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.put<ContentPage>(`/admin/content/${slug}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-admin", slug] });
      qc.invalidateQueries({ queryKey: ["content", slug] });
    },
  });
}
