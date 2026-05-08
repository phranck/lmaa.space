import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SocialMediaAccount,
  SocialMediaAccountCreateInput,
  SocialMediaAccountUpdateInput,
} from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const SOCIAL_MEDIA_ACCOUNTS_KEY = ["social-media-accounts"] as const;

export function useSocialMediaAccounts() {
  return useQuery({
    queryKey: SOCIAL_MEDIA_ACCOUNTS_KEY,
    queryFn: () => api.get<SocialMediaAccount[]>("/admin/social-media-accounts"),
  });
}

export function useCreateSocialMediaAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SocialMediaAccountCreateInput) =>
      api.post<SocialMediaAccount>("/admin/social-media-accounts", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOCIAL_MEDIA_ACCOUNTS_KEY });
    },
  });
}

export function useUpdateSocialMediaAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SocialMediaAccountUpdateInput }) =>
      api.patch<SocialMediaAccount>(`/admin/social-media-accounts/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOCIAL_MEDIA_ACCOUNTS_KEY });
    },
  });
}

export function useDeleteSocialMediaAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-media-accounts/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SOCIAL_MEDIA_ACCOUNTS_KEY });
    },
  });
}

/**
 * Single posting-capable account for the given platform, or undefined when none
 * exists. Convenience wrapper for callers that need the legacy "one mastodon /
 * one bluesky posting account" view.
 */
export function usePostingAccount(platform: "mastodon" | "bluesky") {
  const query = useSocialMediaAccounts();
  const account = query.data?.find((a) => a.canPost && a.platform === platform);
  return { ...query, data: account };
}

/**
 * Footer-eligible accounts (showInFooter=true with non-empty profileUrl), in
 * default order. Used by the footer-builder social-media-block config panel
 * to render the sortable icon list.
 */
export function useFooterEligibleAccounts() {
  const query = useSocialMediaAccounts();
  const accounts = (query.data ?? []).filter(
    (a) => a.showInFooter && a.profileUrl.trim().length > 0,
  );
  return { ...query, data: accounts };
}
