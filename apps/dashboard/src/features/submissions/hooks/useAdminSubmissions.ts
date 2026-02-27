import type { ShopEditFormValue } from "@/features/shops/hooks/useAdminShops.ts";
import { api } from "@/lib/api.ts";
import type {
  DeadLinkReportSummary,
  ShopConcernReportEntry,
  Submission,
  SubmissionStatus,
} from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Loads submissions by moderation status.
 *
 * @param status - Submission status filter.
 * @returns React Query result with submission rows.
 */
export function useAdminSubmissions(status: SubmissionStatus) {
  return useQuery({
    queryKey: ["submissions", status],
    queryFn: () => api.get<Submission[]>(`/admin/submissions?status=${status}`),
  });
}

/**
 * Sends a moderation decision for one submission.
 *
 * @returns React Query mutation for approve/reject/onhold actions.
 */
export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
      sendFeedback,
    }: {
      id: number;
      status: "approved" | "rejected" | "onhold";
      adminNote?: string;
      sendFeedback: boolean;
    }) =>
      api.patch(`/admin/submissions/${id}`, {
        status,
        adminNote: adminNote || undefined,
        sendFeedback,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

/**
 * Updates editable fields of a pending submission.
 *
 * @returns React Query mutation.
 */
export function useEditSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShopEditFormValue }) =>
      api.patch(`/admin/submissions/${id}/edit`, {
        shopName: data.name,
        shopUrl: data.url,
        description: data.description,
        region: data.region,
        shipping: data.shipping,
        categoryIds: data.categoryIds,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

/**
 * Deletes a rejected submission.
 *
 * @returns React Query mutation.
 */
export function useDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/submissions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

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
