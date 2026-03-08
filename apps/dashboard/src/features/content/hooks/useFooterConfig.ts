import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FooterConfig } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const QUERY_KEY = ["admin-footer-config"];

/**
 * Loads the current footer configuration from the admin API.
 */
export function useFooterConfig() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<FooterConfig>("/admin/footer-config"),
  });
}

/**
 * Persists the footer configuration and invalidates the query cache.
 */
export function useSaveFooterConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: FooterConfig) => api.put<FooterConfig>("/admin/footer-config", config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Fetches a rendered HTML preview for a given footer configuration.
 */
export function useFooterPreview() {
  return useMutation({
    mutationFn: (config: FooterConfig) =>
      api.post<{ html: string }>("/admin/footer-config/preview", config),
  });
}
