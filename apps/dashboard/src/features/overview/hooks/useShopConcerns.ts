import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ShopConcernReportEntry } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Loads shop concern reports submitted by users.
 *
 * @param enabled - Whether the authenticated role may load these reports.
 * @returns React Query result with concern report rows.
 */
export function useShopConcernReports(enabled = true) {
  return useQuery({
    queryKey: ["shop-concern-reports"],
    queryFn: () => api.get<ShopConcernReportEntry[]>("/admin/shop-concern-reports"),
    enabled,
  });
}

/**
 * Dismisses one concern report.
 *
 * @returns React Query mutation.
 */
export function useDismissShopConcern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/shop-concern-reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-concern-reports"] }),
  });
}
