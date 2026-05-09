import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SocialMediaPostTemplate,
  SocialMediaPostTemplateInput,
  SocialMediaPostTemplateScope,
} from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const SOCIAL_MEDIA_POST_TEMPLATES_KEY = ["social-media-post-templates"] as const;

export function useSocialMediaPostTemplates(scope?: SocialMediaPostTemplateScope) {
  return useQuery({
    queryKey: [...SOCIAL_MEDIA_POST_TEMPLATES_KEY, scope ?? "all"] as const,
    queryFn: () =>
      api.get<SocialMediaPostTemplate[]>(
        scope
          ? `/admin/social-media-post-templates?scope=${scope}`
          : "/admin/social-media-post-templates",
      ),
  });
}

export function useSocialMediaPostTemplate(id: number) {
  return useQuery({
    queryKey: ["social-media-post-template", id],
    queryFn: () => api.get<SocialMediaPostTemplate>(`/admin/social-media-post-templates/${id}`),
    enabled: id > 0,
  });
}

export function useCreateSocialMediaPostTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SocialMediaPostTemplateInput) =>
      api.post<SocialMediaPostTemplate>("/admin/social-media-post-templates", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SOCIAL_MEDIA_POST_TEMPLATES_KEY });
    },
  });
}

export function useUpdateSocialMediaPostTemplate(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SocialMediaPostTemplateInput>) =>
      api.put<SocialMediaPostTemplate>(`/admin/social-media-post-templates/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SOCIAL_MEDIA_POST_TEMPLATES_KEY });
      void queryClient.invalidateQueries({ queryKey: ["social-media-post-template", id] });
    },
  });
}

export function useDeleteSocialMediaPostTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-media-post-templates/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SOCIAL_MEDIA_POST_TEMPLATES_KEY });
    },
  });
}
