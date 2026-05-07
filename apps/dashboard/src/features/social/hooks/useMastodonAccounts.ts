import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MastodonAccount, MastodonVisibility } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const MASTODON_ACCOUNTS_KEY = ["mastodon-accounts"] as const;

export interface MastodonAccountFormInput {
  label: string;
  instanceUrl: string;
  username?: string;
  accessToken?: string;
  visibility: MastodonVisibility;
  isActive: boolean;
}

export function useMastodonAccounts() {
  return useQuery({
    queryKey: MASTODON_ACCOUNTS_KEY,
    queryFn: () => api.get<MastodonAccount[]>("/admin/social-media/mastodon/accounts"),
  });
}

export function useCreateMastodonAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MastodonAccountFormInput & { accessToken: string }) =>
      api.post<MastodonAccount>("/admin/social-media/mastodon/accounts", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_ACCOUNTS_KEY });
    },
  });
}

export function useUpdateMastodonAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<MastodonAccountFormInput> }) =>
      api.put<MastodonAccount>(`/admin/social-media/mastodon/accounts/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_ACCOUNTS_KEY });
    },
  });
}

export function useDeleteMastodonAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-media/mastodon/accounts/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MASTODON_ACCOUNTS_KEY });
    },
  });
}
