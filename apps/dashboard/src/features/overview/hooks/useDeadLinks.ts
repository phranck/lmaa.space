import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DeadLinkReportSummary } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Loads aggregated dead-link reports.
 *
 * @returns React Query result with dead-link report rows.
 */
export function useDeadLinkReports() {
  return useQuery({
    queryKey: ["dead-link-reports"],
    queryFn: () => api.get<DeadLinkReportSummary[]>("/admin/dead-link-reports"),
  });
}

/**
 * Dismisses all dead-link reports for a shop.
 *
 * @returns React Query mutation.
 */
export function useDismissDeadLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) => api.delete(`/admin/dead-link-reports/${shopId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dead-link-reports"] }),
  });
}

/**
 * Deletes/soft-deletes shops directly from the dead-link report workflow.
 *
 * @returns React Query mutation.
 */
export function useDeleteShopFromDeadLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shopId,
      reason,
      mode,
    }: {
      shopId: number;
      reason?: string;
      mode?: "mark_deleted" | "delete";
    }) =>
      api.delete(`/admin/shops/${shopId}`, {
        wasReported: true,
        reason: reason ?? null,
        mode: mode ?? "mark_deleted",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dead-link-reports"] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}
