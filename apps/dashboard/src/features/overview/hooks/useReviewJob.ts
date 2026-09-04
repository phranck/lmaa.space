import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import type { ReviewCost, ReviewJobDetail, ReviewJobListItem, ReviewJobState } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/** How often a running check is polled, in milliseconds. */
const ACTIVE_POLL_INTERVAL_MS = 10_000;

const ACTIVE_STATES = new Set(["queued", "running", "provider_waiting", "applying"]);

function reviewKey(submissionId: number) {
  return ["submission-review", submissionId] as const;
}

/**
 * Loads the automated review of one submission.
 *
 * @param submissionId - Submission to load the review for.
 * @param activePollMs - How often to ask whilst the check is running. A caller
 * that shows the run as it happens passes a shorter interval than the page's.
 * @returns The query, whose data is `null` when no review exists yet.
 *
 * @remarks
 * Polls whilst the check is still running and stops once it reaches a terminal
 * state, so an open detail page shows progress without holding a request open
 * or polling a finished check forever.
 */
export function useReviewJob(submissionId: number, activePollMs: number = ACTIVE_POLL_INTERVAL_MS) {
  return useQuery({
    queryKey: reviewKey(submissionId),
    queryFn: () => api.get<ReviewJobDetail | null>(`/admin/submissions/${submissionId}/review`),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state && ACTIVE_STATES.has(state) ? activePollMs : false;
    },
  });
}

/**
 * Queues an automated review for a submission.
 *
 * @param submissionId - Submission to review.
 * @returns The mutation. Calling it twice is harmless, because the backend
 * returns the existing job rather than creating a second one.
 */
export function useStartReviewJob(submissionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/admin/submissions/${submissionId}/review`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKey(submissionId) }),
  });
}

/**
 * Runs a finished review again.
 *
 * @param submissionId - Submission the job belongs to, for cache invalidation.
 * @returns The mutation, which takes the job id.
 */
export function useRetryReviewJob(submissionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/admin/review-jobs/${jobId}/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKey(submissionId) }),
  });
}

/**
 * Stops a review that has not finished.
 *
 * @param submissionId - Submission the job belongs to, for cache invalidation.
 * @returns The mutation, which takes the job id.
 */
export function useCancelReviewJob(submissionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/admin/review-jobs/${jobId}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKey(submissionId) }),
  });
}

/**
 * Puts a report back into the queue so the worker sends it again.
 *
 * @param submissionId - Submission the job belongs to, for cache invalidation.
 * @returns The mutation, which takes the job id.
 */
export function useResendReviewReport(submissionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/admin/review-jobs/${jobId}/report/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKey(submissionId) }),
  });
}

/**
 * Reloads the submission once its check has finished.
 *
 * @param submissionId - Submission being watched.
 * @param state - State of its check, or `undefined` while none is loaded.
 *
 * @remarks
 * A check writes its research into the submission, and a moderator may have
 * that submission open whilst it does. Without this the page keeps showing what
 * it fetched before the check ran, which reads as the check having found
 * nothing.
 */
export function useReloadSubmissionAfterReview(
  submissionId: number,
  state: ReviewJobState | undefined,
): void {
  const queryClient = useQueryClient();
  const wasActive = useRef(false);

  useEffect(() => {
    const active = state !== undefined && ACTIVE_STATES.has(state);
    if (wasActive.current && !active) {
      void queryClient.invalidateQueries({ queryKey: ["submission", submissionId] });
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
    }
    wasActive.current = active;
  }, [queryClient, state, submissionId]);
}

/**
 * Loads every automated check, newest first.
 *
 * @returns The query, whose data lists each check with its shop and its cost.
 *
 * @remarks
 * Polls whilst any check is still running, so the overview keeps up with the
 * worker without a manual reload.
 */
export function useReviewJobs() {
  return useQuery({
    queryKey: ["review-jobs"] as const,
    queryFn: () => api.get<ReviewJobListItem[]>("/admin/review-jobs"),
    refetchInterval: (query) =>
      query.state.data?.some((job) => ACTIVE_STATES.has(job.state))
        ? ACTIVE_POLL_INTERVAL_MS
        : false,
  });
}

/**
 * What the automation has cost in total, today and per check.
 *
 * @returns The query, whose data carries all three amounts already converted,
 * plus how many checks the average is taken over.
 *
 * @remarks
 * Read from the spend ledger rather than added up from the list, because the
 * list only holds checks whose suggestion still exists, whilst the ledger holds
 * everything that was billed.
 */
export function useReviewSpend() {
  return useQuery({
    queryKey: ["review-spend"] as const,
    queryFn: () =>
      api.get<{
        total: ReviewCost;
        today: ReviewCost;
        average: ReviewCost;
        checkCount: number;
      }>("/admin/review-jobs/spend"),
  });
}

/**
 * Maps every submission that has an automated check to its verdict.
 *
 * @returns Submission id to verdict, for rows that have one.
 *
 * @remarks
 * Derived from the same list the overview reads, so a list of suggestions costs
 * one request rather than one per row.
 */
export function useReviewVerdictBySubmission(): Map<number, ReviewJobListItem> {
  const { data: jobs = [] } = useReviewJobs();
  return useMemo(() => {
    const map = new Map<number, ReviewJobListItem>();
    for (const job of jobs) {
      if (!map.has(job.submissionId)) map.set(job.submissionId, job);
    }
    return map;
  }, [jobs]);
}
