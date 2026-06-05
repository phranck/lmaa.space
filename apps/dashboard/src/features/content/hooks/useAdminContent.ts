import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import type { ContentPreviewSessionPayload, ContentPreviewSessionResponse } from "@lmaa/contracts";
import type { ContentPage, ContentPageSummary, ContentWidth } from "@lmaa/shared";

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
 * Creates a short-lived public preview token for the current editor state.
 *
 * @param slug - Current persisted page slug used for the admin route.
 * @returns React Query mutation returning preview session metadata.
 */
export function useCreateContentPreviewSession(slug: string) {
  const [isPending, setIsPending] = useState(false);

  const createPreviewSession = useCallback(
    async (data: ContentPreviewSessionPayload) => {
      setIsPending(true);
      try {
        return await api.post<ContentPreviewSessionResponse>(
          `/admin/content/${slug}/preview-sessions`,
          data,
        );
      } finally {
        setIsPending(false);
      }
    },
    [slug],
  );

  return { createPreviewSession, isPending };
}

/**
 * Creates a new content page.
 *
 * @returns React Query mutation for page creation.
 */
export function useCreateContentPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; title: string; status?: string; contentWidth?: ContentWidth }) =>
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
    mutationFn: (data: {
      title?: string;
      slug?: string;
      status?: string;
      showTitle?: boolean;
      contentWidth?: ContentWidth;
    }) =>
      api.patch<{
        slug: string;
        title: string;
        status: string;
        showTitle: boolean;
        contentWidth: ContentWidth;
        updatedAt: string | null;
      }>(`/admin/content/${slug}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["content-pages"] });
      qc.invalidateQueries({ queryKey: ["content-admin", slug] });
      if (updated.slug !== slug) {
        qc.invalidateQueries({ queryKey: ["content-admin", updated.slug] });
      }
    },
  });
}
