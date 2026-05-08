import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BlueskyAccount } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const BLUESKY_ACCOUNT_KEY = ["bluesky-account"] as const;

export interface BlueskyAccountMutationInput {
  label: string;
  handle: string;
  appPassword?: string;
  isActive: boolean;
}

export function useBlueskyAccount() {
  return useQuery({
    queryKey: BLUESKY_ACCOUNT_KEY,
    queryFn: () => api.get<BlueskyAccount | null>("/admin/social-media/bluesky/account"),
  });
}

export function useCreateBlueskyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BlueskyAccountMutationInput & { appPassword: string }) =>
      api.post<BlueskyAccount>("/admin/social-media/bluesky/account", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BLUESKY_ACCOUNT_KEY });
    },
  });
}

export function useUpdateBlueskyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<BlueskyAccountMutationInput> }) =>
      api.put<BlueskyAccount>(`/admin/social-media/bluesky/account/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BLUESKY_ACCOUNT_KEY });
    },
  });
}

export function useDeleteBlueskyAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/social-media/bluesky/account/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BLUESKY_ACCOUNT_KEY });
    },
  });
}
