import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Submission, SubmissionStatus } from "@lmaa/shared";
import type { ShopEditFormValue } from "@lmaa/ui/shop-edit-form";

import { api } from "@/lib/api.ts";
import { toHeadquartersPayload } from "@/lib/form-payload-builders.ts";

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
 * Loads a single submission for route-based moderation/editing.
 *
 * @param id - Submission id or `null` to disable the query.
 * @returns React Query result with one submission row.
 */
export function useAdminSubmission(id: number | null) {
  return useQuery({
    queryKey: ["submission", id],
    enabled: id !== null,
    queryFn: () => api.get<Submission>(`/admin/submissions/${id}`),
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
      notificationTemplateId,
      templateAssignments,
    }: {
      id: number;
      status: "approved" | "rejected" | "onhold" | "pending";
      adminNote?: string;
      rejectionLongText?: string;
      rejectionToken?: string;
      notificationTemplateId?: number;
      templateAssignments?: Array<{ accountId: number; templateId: number | null }>;
    }) =>
      api.patch<Submission>(`/admin/submissions/${id}`, {
        status,
        adminNote: adminNote || undefined,
        rejectionLongText: rejectionLongText || undefined,
        rejectionToken: rejectionToken || undefined,
        notificationTemplateId: notificationTemplateId || undefined,
        templateAssignments: templateAssignments?.length ? templateAssignments : undefined,
      }),
    onSuccess: (_submission, variables) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["submission", variables.id] });
      qc.invalidateQueries({ queryKey: ["me-template-choices"] });
    },
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
    mutationFn: ({
      id,
      data,
      ogImage,
    }: {
      id: number;
      data: ShopEditFormValue;
      ogImage?: string | null;
    }) =>
      api.patch<Submission>(`/admin/submissions/${id}/edit`, {
        shopName: data.name,
        shopUrl: data.url,
        description: data.description,
        ogImage: ogImage ?? null,
        logoBackgroundColor: data.logoBackgroundColor,
        region: data.region,
        shipping: data.shipping,
        categoryIds: data.categoryIds,
        contactEmail: data.contactEmail,
        headquarters: toHeadquartersPayload(data),
        shopCheckNotes: data.shopCheckNotes,
        socialMedia: data.socialMedia,
        paymentMethods: data.paymentMethods,
      }),
    onSuccess: (_submission, variables) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["submission", variables.id] });
    },
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
    onSuccess: (_result, id) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.removeQueries({ queryKey: ["submission", id] });
    },
  });
}

type ImportResult = { imported: number; skipped: number; errors: string[] };

export function useImportSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: Array<Record<string, unknown>>) =>
      api.post<ImportResult>("/admin/submissions/import", entries),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}
