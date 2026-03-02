import type { ShopEditFormValue } from "@/features/content/hooks/useAdminShops.ts";
import { api } from "@/lib/api.ts";
import type { Submission, SubmissionStatus } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
      rejectionLongText,
      rejectionToken,
      sendFeedback,
    }: {
      id: number;
      status: "approved" | "rejected" | "onhold" | "pending";
      adminNote?: string;
      rejectionLongText?: string;
      rejectionToken?: string;
      sendFeedback: boolean;
    }) =>
      api.patch(`/admin/submissions/${id}`, {
        status,
        adminNote: adminNote || undefined,
        rejectionLongText: rejectionLongText || undefined,
        rejectionToken: rejectionToken || undefined,
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
