import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MastodonAccount, MastodonVisibility } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const MASTODON_ACCOUNT_KEY = ["mastodon-account"] as const;

export interface MastodonAccountFormInput {
  label: string;
  instanceUrl: string;
  username?: string;
  accessToken?: string;
  visibility: MastodonVisibility;
  maxPostCharacters: number;
  isActive: boolean;
}

export function useMastodonAccount() {
  return useQuery({
    queryKey: MASTODON_ACCOUNT_KEY,
    queryFn: () => api.get<MastodonAccount | null>("/admin/social-media/mastodon/account"),
  });
}

export function useCreateMastodonAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MastodonAccountFormInput & { accessToken: string }) =>
      api.post<MastodonAccount>("/admin/social-media/mastodon/account", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_ACCOUNT_KEY });
    },
  });
}

export function useUpdateMastodonAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<MastodonAccountFormInput> }) =>
      api.put<MastodonAccount>(`/admin/social-media/mastodon/account/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_ACCOUNT_KEY });
    },
  });
}

export function useDeleteMastodonAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-media/mastodon/account/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_ACCOUNT_KEY });
    },
  });
}
