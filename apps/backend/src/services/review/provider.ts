import type { ReviewUsage } from "@lmaa/shared";

import type { ReviewRunContext } from "./context.js";
import type { ReviewSkill } from "./skill.js";

/**
 * Everything one provider run needs.
 */
export interface ReviewProviderRequest {
  submissionId: number;
  shopUrl: string;
  shopName: string;
  skill: ReviewSkill;
  context: ReviewRunContext;
  /** Ceiling for this attempt, in nano-units of the rate card currency. */
  costLimitNano: bigint;
  /** Cancels the run when the worker shuts down or the job is cancelled. */
  signal?: AbortSignal;
  /**
   * Called whenever the run moves to a new step, such as a search it is about
   * to make or a page it is about to read.
   *
   * @remarks
   * A check runs for minutes and its steps are the only thing that changes in
   * that time, so this is what makes waiting for it legible. The text is
   * already fit to be read by a moderator.
   */
  onProgress?: (step: string) => void;
}

/**
 * How a provider run ended.
 *
 * @remarks
 * `result` means the provider returned a parsed JSON object. Whether that
 * object is a usable review is decided afterwards by the contract, not here:
 * the adapter's job ends at "the provider answered with JSON".
 */
export type ReviewProviderOutcomeKind =
  | "result"
  | "refused"
  | "invalid_output"
  | "budget_exceeded"
  | "failed";

/**
 * What a provider run produced, in provider-neutral terms.
 */
export interface ReviewProviderOutcome {
  kind: ReviewProviderOutcomeKind;
  /** Parsed JSON the provider returned, or `null` when it produced none. */
  raw: unknown;
  usage: ReviewUsage;
  model: string;
  effort: string | null;
  /** Provider-side identifier of the last message, for correlating with their logs. */
  providerResponseId: string | null;
  /** Why the provider stopped, verbatim, for the audit trail. */
  stopReason: string | null;
  /** Stable code when the run did not produce a result. */
  errorCode: string | null;
  /** Short, already redacted description of the failure. */
  errorMessage: string | null;
  /** `true` when trying the same attempt again could plausibly succeed. */
  retryable: boolean;
}

/**
 * A provider that can run one automated shop review.
 *
 * @remarks
 * The worker owns retries, leases, validation and application. A provider only
 * runs one attempt and reports what came back, which is what keeps a second
 * provider from having to reimplement any of the orchestration.
 */
export interface ReviewProvider {
  /** Stable provider name persisted with every job, for example `anthropic`. */
  readonly name: string;
  /** Model the provider is configured to use. */
  readonly model: string;
  /** Reasoning effort the provider requests, or `null` where the model takes none. */
  readonly effort: string | null;
  /**
   * Reports whether the provider has everything it needs to run.
   *
   * @returns `true` when a credential and configuration are present.
   */
  isConfigured(): boolean;
  /**
   * Runs one review attempt.
   *
   * @param request - The submission under review and the run's budget.
   * @returns What the provider produced, never throwing for a provider-side failure.
   */
  runReview(request: ReviewProviderRequest): Promise<ReviewProviderOutcome>;
}
