import { reviewAcceptSchema } from "@lmaa/contracts";
import type { ReviewAcceptPayload } from "@lmaa/contracts";
import type { ReviewJobDetail } from "@lmaa/shared";

/**
 * Reads a validated acceptance draft that a moderator may apply to a held review.
 *
 * @param reviewJob - The review job to inspect, or `null` while it is loading or absent.
 * @returns The acceptance draft when the job offers one, otherwise `null`.
 *
 * @remarks
 * Only a completed job whose own verdict is `onhold` may offer the deferred
 * approval action. The provider result can retain `accept` when applying that
 * acceptance caused a domain conflict, so the job verdict is the authoritative
 * state for this action.
 */
export function readDeferredAcceptProposal(
  reviewJob: Pick<ReviewJobDetail, "state" | "verdict" | "result"> | null | undefined,
): ReviewAcceptPayload | null {
  if (!reviewJob || reviewJob.state !== "completed" || reviewJob.verdict !== "onhold") {
    return null;
  }

  const result = reviewJob.result;
  if (typeof result !== "object" || result === null || !("accept" in result)) return null;

  const parsed = reviewAcceptSchema.safeParse(result.accept);
  return parsed.success ? parsed.data : null;
}
