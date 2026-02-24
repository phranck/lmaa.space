import { api } from "@/lib/api.ts";
import type { ContentPage, ContentPageSummary } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useContentPages() {
  return useQuery({
    queryKey: ["content-pages"],
    queryFn: () => api.get<ContentPageSummary[]>("/admin/content"),
  });
}

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

export function useCreateContentPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; title: string; status?: string }) =>
      api.post<ContentPageSummary>("/admin/content", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-pages"] });
    },
  });
}

export function useDeleteContentPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete<{ message: string }>(`/admin/content/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-pages"] });
    },
  });
}

export function usePatchContentPage(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; slug?: string; status?: string }) =>
      api.patch<{ slug: string; title: string; status: string; updatedAt: string | null }>(
        `/admin/content/${slug}`,
        data,
      ),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["content-pages"] });
      qc.invalidateQueries({ queryKey: ["content-admin", slug] });
      if (updated.slug !== slug) {
        qc.invalidateQueries({ queryKey: ["content-admin", updated.slug] });
      }
    },
  });
}
