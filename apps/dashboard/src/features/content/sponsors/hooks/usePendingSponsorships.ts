import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PendingSponsorshipTakeover, Sponsor } from "@lmaa/contracts";
import type { SocialMediaLinks } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * One announcement waiting to be paid, as the dashboard reads it.
 *
 * The row carries what the person typed plus the reference their transfer will
 * quote. It is not the public contract, because nothing of this is ever sent to
 * a visitor: the reference addresses a private record.
 */
export interface PendingSponsorshipRow {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  socialMedia: SocialMediaLinks;
  claim: string;
  /** What they said they would give, in cents, from the ladder above the form. */
  amountCents: number;
  published: boolean;
  createdAt: string;
}

/** Everything waiting to become a sponsor, oldest first. */
export function usePendingSponsorships() {
  return useQuery({
    queryKey: ["pending-sponsorships"],
    queryFn: () => api.get<PendingSponsorshipRow[]>("/admin/pending-sponsorships"),
    staleTime: 30 * 1000,
  });
}

/**
 * Turns one entry into a sponsor.
 *
 * The sponsors are invalidated with the entries, because the row moves from one
 * list to the other and both are on screen at the same time.
 */
export function useTakeOverPendingSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: PendingSponsorshipTakeover }) =>
      api.post<Sponsor>(`/admin/pending-sponsorships/${id}/takeover`, payment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-sponsorships"] });
      void queryClient.invalidateQueries({ queryKey: ["sponsors"] });
    },
  });
}

/** Throws one entry away, with everything the person typed. */
export function useDeletePendingSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/admin/pending-sponsorships/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-sponsorships"] }),
  });
}
