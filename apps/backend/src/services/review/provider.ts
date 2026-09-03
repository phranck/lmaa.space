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
  /** Payment methods read from the shop's markup before the run, as canonical keys. */
  paymentMethods?: readonly string[];
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
  /**
   * The batch a previous attempt already submitted this check as.
   *
   * @remarks
   * A worker that restarts, or an attempt that gave up waiting, resumes that
   * batch instead of submitting a second one. The provider bills what it
   * processed either way, so resubmitting would pay for the same check twice.
   */
  resumeBatchId?: string;
  /** Called once the check has been submitted, so the batch survives a restart. */
  onBatchCreated?: (batchId: string) => void;
}

/**
 * A text that has to be rewritten, with the rule it broke.
 */
export interface TextRepairRequest {
  /** Where it sits in the result, used to put the rewritten text back. */
  path: string;
  value: string;
  problem: string;
}

/**
 * What a repair produced.
 */
export interface TextRepairOutcome {
  /** The rewritten texts by path, empty where the provider could not help. */
  texts: Map<string, string>;
  /** What the repair itself consumed, so it is costed like everything else. */
  usage: ReviewUsage;
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
  /**
   * The provider's answer as text, where it could not be turned into a result.
   *
   * @remarks
   * Set on `invalid_output` and `null` everywhere else. A parsed answer is kept
   * in {@link ReviewProviderOutcome.raw}, and an answer that never arrived has
   * no text to keep, so this is the one case that would otherwise lose it.
   */
  rawAnswer: string | null;
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
   * Rewrites texts that broke a mechanical German rule.
   *
   * @param texts - The offending texts with the rule each one broke.
   * @returns The rewritten texts and what the rewriting consumed.
   *
   * @remarks
   * A separate, tool-free call, because the research behind a result is sound
   * when only its wording is not, and repeating the research to fix a dash
   * costs a hundred times what rewriting the sentence does.
   */
  repairTexts(texts: TextRepairRequest[]): Promise<TextRepairOutcome>;
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
