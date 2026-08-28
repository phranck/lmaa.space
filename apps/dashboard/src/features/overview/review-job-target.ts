import type { ReviewJobListItem } from "@lmaa/shared";

/**
 * Resolves where a row of the automated checks list leads.
 *
 * @param job - The check, carrying the suggestion it ran on and the shop that
 * suggestion was admitted as.
 * @returns The dashboard path of whatever the check produced.
 *
 * @remarks
 * A check whose suggestion was admitted leads to the shop, because the
 * suggestion editor has nothing left to edit once a shop exists. Everything
 * else leads to the suggestion, which is still under moderation. The shop id is
 * read as a number rather than compared against `null`, so a response from a
 * backend that does not send the field yet lands on the suggestion instead of
 * on a path built from `undefined`.
 */
export function reviewJobTarget(job: Pick<ReviewJobListItem, "submissionId" | "shopId">): string {
  return typeof job.shopId === "number"
    ? `/shops/${job.shopId}`
    : `/reports/suggestions/${job.submissionId}`;
}
