import type {
  ReviewAutomationMode,
  ReviewJobState,
  ReviewReportState,
  ReviewVerdict,
} from "../constants/review-jobs.js";

/**
 * Token counts and tool calls a provider reported for one attempt.
 *
 * @remarks
 * Every field is optional because providers differ in what they expose, and a
 * missing field is what marks a cost as incomplete rather than something to
 * silently treat as zero.
 */
export interface ReviewUsage {
  /** Input tokens that were not served from the provider's cache. */
  inputTokens?: number;
  /** Input tokens written into the provider's cache, billed above the plain input rate. */
  cacheWriteTokens?: number;
  /** Input tokens served from the provider's cache at the reduced rate. */
  cachedInputTokens?: number;
  /** Output tokens that appear in the answer. */
  outputTokens?: number;
  /** Output tokens spent on reasoning, billed at the output rate. */
  reasoningTokens?: number;
  /** Number of provider-hosted web searches. */
  webSearchCalls?: number;
  /** Number of tool calls the worker executed on the model's behalf. */
  toolCalls?: number;
}

/**
 * What one attempt cost, derived from {@link ReviewUsage} and a rate card.
 */
export interface ReviewCost {
  /** Total in nano-units of {@link ReviewCost.currency}, so 1 000 000 000 is one unit. */
  totalNano: string;
  /** ISO 4217 code of the rate card that produced the amount. */
  currency: string;
  /** Identifier of the rate card version, so an amount can be recalculated later. */
  rateCardVersion: string;
  /** `false` when a billable dimension was missing, which forbids showing the amount as final. */
  complete: boolean;
  /** Usage dimensions the rate card could not price. */
  missingDimensions: string[];
  /**
   * The same amount in the currency it is shown in.
   *
   * @remarks
   * Converted with the rate pinned in the rate card that produced the amount,
   * not with today's rate, so what a finished check cost stays what it cost.
   * Absent when the amount has not been converted, in which case
   * {@link ReviewCost.totalNano} is what to show.
   */
  displayTotalNano?: string;
  /** Currency of {@link ReviewCost.displayTotalNano}. */
  displayCurrency?: string;
}

/**
 * What one attempt of a review job did, kept for the itemized cost breakdown.
 *
 * @remarks
 * Attempts live on the job rather than in a table of their own. A retry belongs
 * to the same check, and separating them would mean joining two rows back
 * together everywhere the cost or history of a check is needed.
 */
export interface ReviewAttemptRecord {
  /** 1-based attempt number within the job. */
  attempt: number;
  provider: string;
  model: string;
  /** Reasoning effort the attempt requested, or `null` where the model takes none. */
  effort: string | null;
  /** Provider-side message identifier, for correlating with provider logs. */
  providerResponseId: string | null;
  /** Why the provider stopped, for example `end_turn` or `refusal`. */
  stopReason: string | null;
  usage: ReviewUsage;
  cost: ReviewCost;
  /** How the attempt ended, in our terms. */
  outcome: "succeeded" | "invalid_output" | "refused" | "failed" | "cancelled" | "budget_exceeded";
  /** Stable error code when the attempt did not succeed. */
  errorCode: string | null;
  startedAt: string;
  finishedAt: string;
}

/**
 * One evidence source the review used to support its verdict.
 */
export interface ReviewEvidenceSource {
  /** Absolute http(s) URL of the source. */
  url: string;
  /** What the source is, for example `Impressum` or `Handelsregister`. */
  label: string;
  /** When the worker retrieved it, as an ISO 8601 timestamp. */
  retrievedAt: string;
}

/**
 * A single immutable audit entry belonging to a review job.
 */
export interface ReviewEvent {
  id: number;
  jobId: number;
  attempt: number;
  /** Execution state the job held when the entry was written. */
  state: ReviewJobState;
  /** Short machine-readable label, for example `provider.started` or `result.applied`. */
  event: string;
  /** Human-readable detail, already redacted. */
  detail: string | null;
  /** Correlates with the backend log line that carries the full cause. */
  errorId: string | null;
  createdAt: string;
}

/**
 * An automated review job as the dashboard sees it.
 */
export interface ReviewJob {
  id: number;
  submissionId: number;
  state: ReviewJobState;
  attempt: number;
  maxAttempts: number;
  /** Mode the job was claimed under, which decides what it was allowed to change. */
  mode: ReviewAutomationMode;
  /** `true` for jobs created by tests and fixtures, which never send a report. */
  synthetic: boolean;
  verdict: ReviewVerdict | null;
  provider: string | null;
  model: string | null;
  reasoningEffort: string | null;
  /** SHA-256 of the canonical shop-check rules the run was given. */
  skillVersion: string | null;
  /** Version of the result contract the output was validated against. */
  schemaVersion: string | null;
  /** Provider-side identifier of the response, used to resume after a restart. */
  providerResponseId: string | null;
  usage: ReviewUsage | null;
  cost: ReviewCost | null;
  /** Why the run resolved to `onhold`, in German, shown to the reviewer. */
  onholdReason: string | null;
  /** What the run is doing right now, in German, or `null` between attempts. */
  progress: string | null;
  reportState: ReviewReportState;
  reportAttempts: number;
  reportLastAttemptAt: string | null;
  errorCode: string | null;
  errorId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A review job together with the submission it belongs to.
 *
 * @remarks
 * Carries the shop's name and address so a list can be read without one query
 * per row.
 */
export interface ReviewJobListItem extends ReviewJob {
  shopName: string;
  shopUrl: string;
  /** Moderation status of the submission, which the check may have led to. */
  submissionStatus: string;
}

/**
 * A review job together with its audit trail and the proposed result.
 */
export interface ReviewJobDetail extends ReviewJob {
  events: ReviewEvent[];
  /** Validated provider result, or `null` while none has passed validation. */
  result: unknown;
}
