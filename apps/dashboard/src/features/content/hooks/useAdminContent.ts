import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ContentPage, ContentPageSummary } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Loads all content page summaries for the content overview.
 *
 * @returns React Query result with page summaries.
 */
export function useContentPages() {
  return useQuery({
    queryKey: ["content-pages"],
    queryFn: () => api.get<ContentPageSummary[]>("/admin/content"),
    staleTime: 60 * 1000,
  });
}

/**
 * Loads one content page including body content.
 *
 * @param slug - Page slug.
 * @returns React Query result for the selected page.
 */
export function useAdminContentPage(slug: string) {
  return useQuery({
    queryKey: ["content-admin", slug],
    queryFn: () => api.get<ContentPage>(`/admin/content/${slug}`),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}

/**
 * Saves full page body content for an existing slug.
 *
 * @param slug - Target content page slug.
 * @returns React Query mutation.
 */
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

/**
 * Creates a new content page.
 *
 * @returns React Query mutation for page creation.
 */
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

/**
 * Deletes a content page by slug.
 *
 * @returns React Query mutation for content deletion.
 */
export function useDeleteContentPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete<{ message: string }>(`/admin/content/${slug}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-pages"] });
    },
  });
}

/**
 * Patches page metadata (title/slug/status).
 *
 * Hidden behavior: invalidates both old and new slug cache keys when slug
 * changes.
 *
 * @param slug - Current page slug.
 * @returns React Query mutation.
 */
export function usePatchContentPage(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; slug?: string; status?: string; showTitle?: boolean }) =>
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
