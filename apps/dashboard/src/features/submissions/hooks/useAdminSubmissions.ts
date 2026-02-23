import { api } from "@/lib/api.ts";
import type { Submission } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface DeadLinkReport {
  shopId: number;
  shopName: string;
  shopUrl: string;
  reportCount: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminSubmissions(status: SubmissionStatus) {
  return useQuery({
    queryKey: ["submissions", status],
    queryFn: () => api.get<Submission[]>(`/admin/submissions?status=${status}`),
  });
}

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
      status: "approved" | "rejected";
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

export function useDeadLinkReports() {
  return useQuery({
    queryKey: ["dead-link-reports"],
    queryFn: () => api.get<DeadLinkReport[]>("/admin/dead-link-reports"),
  });
}

export function useDismissDeadLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) => api.delete(`/admin/dead-link-reports/${shopId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dead-link-reports"] }),
  });
}

export function useDeleteShopFromDeadLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) => api.delete(`/admin/shops/${shopId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dead-link-reports"] });
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    },
  });
}
