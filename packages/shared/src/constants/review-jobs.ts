/**
 * Execution states of an automated review job.
 *
 * @remarks
 * These describe what the worker is doing, not what the review decided. The
 * decision lives in {@link REVIEW_VERDICTS} and the moderation outcome stays in
 * `submissions.status`, so none of the three overloads another.
 */
export const REVIEW_JOB_STATES = [
  "queued",
  "running",
  "provider_waiting",
  "applying",
  "completed",
  "failed",
  "cancelled",
] as const;

/**
 * Union of all execution states an automated review job can hold.
 */
export type ReviewJobState = (typeof REVIEW_JOB_STATES)[number];

/**
 * States in which a job still owns work and blocks a second job for the same
 * submission.
 */
export const ACTIVE_REVIEW_JOB_STATES = [
  "queued",
  "running",
  "provider_waiting",
  "applying",
] as const satisfies readonly ReviewJobState[];

/**
 * States a job can no longer leave.
 */
export const TERMINAL_REVIEW_JOB_STATES = [
  "completed",
  "failed",
  "cancelled",
] as const satisfies readonly ReviewJobState[];

/**
 * Allowed successor states for every execution state.
 *
 * @remarks
 * `provider_waiting` may return to `running` because a poll that finds the
 * response still incomplete leaves the attempt where it was, and a retry after
 * a recoverable provider error starts the attempt again.
 */
export const REVIEW_JOB_TRANSITIONS: Readonly<Record<ReviewJobState, readonly ReviewJobState[]>> = {
  queued: ["running", "cancelled"],
  running: ["provider_waiting", "applying", "queued", "failed", "cancelled"],
  provider_waiting: ["running", "applying", "queued", "failed", "cancelled"],
  applying: ["completed", "queued", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

/**
 * Reports whether a job may move from `from` to `to`.
 *
 * @param from - Current execution state.
 * @param to - Requested execution state.
 * @returns `true` when the transition is defined, `false` otherwise.
 */
export function canTransitionReviewJob(from: ReviewJobState, to: ReviewJobState): boolean {
  return REVIEW_JOB_TRANSITIONS[from].includes(to);
}

/**
 * Reports whether a job in this state still owns work.
 *
 * @param state - Execution state to classify.
 * @returns `true` while the job is queued, running, waiting or applying.
 */
export function isActiveReviewJobState(state: ReviewJobState): boolean {
  return (ACTIVE_REVIEW_JOB_STATES as readonly ReviewJobState[]).includes(state);
}

/**
 * The three outcomes an automated review can reach.
 *
 * @remarks
 * `onhold` is the safe outcome. Ambiguity, missing evidence, invalid provider
 * output, a domain conflict and exhausted retries all resolve to it rather than
 * to a guessed acceptance or rejection.
 */
export const REVIEW_VERDICTS = ["accept", "reject", "onhold"] as const;

/**
 * Union of the outcomes an automated review can reach.
 */
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

/**
 * Delivery states of the admin report belonging to a review job.
 *
 * @remarks
 * `skipped` covers checks that must never send a report, which are synthetic
 * fixtures and runs made while reporting is switched off.
 */
export const REVIEW_REPORT_STATES = ["pending", "sending", "sent", "failed", "skipped"] as const;

/**
 * Union of all admin report delivery states.
 */
export type ReviewReportState = (typeof REVIEW_REPORT_STATES)[number];

/**
 * How far the automation may act on the submission it reviewed.
 *
 * @remarks
 * `off` claims no work at all, so queued jobs simply wait. `assist` writes what
 * the check researched into the submission and marks it ready for a human
 * decision, which is what the manual import path does today.
 *
 * Applying a verdict publicly is a separate switch, see
 * {@link REVIEW_AUTO_APPLY_VERDICTS}.
 */
export const REVIEW_AUTOMATION_MODES = ["off", "assist"] as const;

/**
 * Union of all automation modes.
 */
export type ReviewAutomationMode = (typeof REVIEW_AUTOMATION_MODES)[number];

/**
 * Verdicts that may be applied without a human, when the operator lists them.
 *
 * @remarks
 * The list is empty by default and only has an effect in `assist` mode. An
 * `onhold` verdict is never in it, because on-hold is what happens when nobody
 * decides.
 */
export const REVIEW_AUTO_APPLY_VERDICTS = ["accept", "reject"] as const;

/**
 * Union of the verdicts that can be enabled for automatic application.
 */
export type ReviewAutoApplyVerdict = (typeof REVIEW_AUTO_APPLY_VERDICTS)[number];
