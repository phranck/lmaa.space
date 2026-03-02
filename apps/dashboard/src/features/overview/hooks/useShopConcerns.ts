import { api } from "@/lib/api.ts";
import type { ShopConcernReportEntry } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Loads shop concern reports submitted by users.
 *
 * @returns React Query result with concern report rows.
 */
export function useShopConcernReports() {
  return useQuery({
    queryKey: ["shop-concern-reports"],
    queryFn: () => api.get<ShopConcernReportEntry[]>("/admin/shop-concern-reports"),
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
