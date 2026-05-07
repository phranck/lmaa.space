import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MastodonPostTemplate, MastodonPostTemplateInput } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const MASTODON_POST_TEMPLATES_KEY = ["mastodon-post-templates"] as const;

export function useMastodonPostTemplates() {
  return useQuery({
    queryKey: MASTODON_POST_TEMPLATES_KEY,
    queryFn: () => api.get<MastodonPostTemplate[]>("/admin/mastodon-post-templates"),
  });
}

export function useMastodonPostTemplate(id: number) {
  return useQuery({
    queryKey: ["mastodon-post-template", id],
    queryFn: () => api.get<MastodonPostTemplate>(`/admin/mastodon-post-templates/${id}`),
    enabled: id > 0,
  });
}

export function useCreateMastodonPostTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MastodonPostTemplateInput) =>
      api.post<MastodonPostTemplate>("/admin/mastodon-post-templates", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_POST_TEMPLATES_KEY });
    },
  });
}

export function useUpdateMastodonPostTemplate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MastodonPostTemplateInput>) =>
      api.put<MastodonPostTemplate>(`/admin/mastodon-post-templates/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_POST_TEMPLATES_KEY });
      void qc.invalidateQueries({ queryKey: ["mastodon-post-template", id] });
    },
  });
}

export function useDeleteMastodonPostTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/mastodon-post-templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_POST_TEMPLATES_KEY });
    },
  });
}
