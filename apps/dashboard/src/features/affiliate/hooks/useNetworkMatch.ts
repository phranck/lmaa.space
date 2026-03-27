import { useMutation, useQuery } from "@tanstack/react-query";

import type { NetworkMatchResult } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Validate stored credentials for a specific affiliate network.
 */
export function useValidateNetworkCredentials() {
  return useMutation({
    mutationFn: async (network: string) => {
      const result = await api.post<{ valid: boolean }>(`/admin/affiliate/networks/${network}/validate`);
      if (!result.valid) throw new Error("Invalid credentials");
      return result;
    },
  });
}

/**
 * Match a single shop to a network programme.
 */
export function useMatchShopToProgram(shopId: number, network: string) {
  return useQuery({
    queryKey: ["network-match", network, shopId],
    queryFn: () =>
      api.get<NetworkMatchResult>(`/admin/affiliate/networks/${network}/match/${shopId}`),
    enabled: false,
  });
}
