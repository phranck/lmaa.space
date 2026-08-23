import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Sponsor, SponsorInput, SponsoringConfig } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

/** Every sponsor, current and past, for the list in the dashboard. */
export function useSponsors() {
  return useQuery({
    queryKey: ["sponsors"],
    queryFn: () => api.get<Sponsor[]>("/admin/sponsors"),
    staleTime: 30 * 1000,
  });
}

/** What the year costs, itemised, and what it takes to be named. */
export function useSponsoringConfig() {
  return useQuery({
    queryKey: ["sponsoring-config"],
    queryFn: () => api.get<SponsoringConfig>("/admin/sponsors/config"),
    staleTime: 30 * 1000,
  });
}

/** Stores the costs and the threshold. */
export function useSaveSponsoringConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: SponsoringConfig) =>
      api.put<SponsoringConfig>("/admin/sponsors/config", config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sponsoring-config"] }),
  });
}

/** Records a new sponsor. */
export function useCreateSponsor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SponsorInput) => api.post<Sponsor>("/admin/sponsors", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sponsors"] }),
  });
}

/**
 * Asks the backend for the picture behind a sponsor's social media address.
 *
 * The lookup runs on the server, so the resolved address is what gets stored
 * and no reader's browser ever calls the sponsor's own instance.
 */
export function useResolveSponsorAvatar() {
  return useMutation({
    mutationFn: (socialMedia: Record<string, string>) =>
      api.post<{ imageUrl: string | null }>("/admin/sponsors/avatar", { socialMedia }),
  });
}

/** Saves one sponsor. */
export function useSaveSponsor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SponsorInput }) =>
      api.put<Sponsor>(`/admin/sponsors/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sponsors"] }),
  });
}

/** Removes one sponsor. */
export function useDeleteSponsor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/admin/sponsors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sponsors"] }),
  });
}
