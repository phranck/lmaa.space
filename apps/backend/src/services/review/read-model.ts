import type {
  ReviewCost,
  ReviewEvent,
  ReviewJob,
  ReviewJobDetail,
  ReviewJobListItem,
} from "@lmaa/shared";

import type { ReviewEventRow, ReviewJobRow } from "../../db/schema.js";
import { toReviewDisplayAmount } from "../../lib/review-cost.js";

function toCost(row: ReviewJobRow): ReviewCost | null {
  if (!row.costCurrency) return null;

  const cost: ReviewCost = {
    totalNano: row.costNano.toString(),
    currency: row.costCurrency,
    rateCardVersion: row.costRateCardVersion ?? "unbekannt",
    complete: row.costComplete,
    missingDimensions: row.costMissingDimensions,
  };

  // Converted here rather than in the browser, so the rate a finished amount
  // was pinned to never has to travel to the client or be looked up twice.
  const display = toReviewDisplayAmount(cost);
  return { ...cost, displayTotalNano: display.totalNano, displayCurrency: display.currency };
}

/**
 * Maps a job row onto the shape the dashboard reads.
 *
 * @param row - The stored job.
 * @returns The job without anything the browser must not see.
 *
 * @remarks
 * The lease owner, the report error and the raw provider payload stay behind.
 * The first two are operational detail, and the third can carry whatever a
 * shop's page said, which belongs in the audit trail rather than in a list
 * view.
 *
 * Money is a `bigint` in the database and a string here, because JSON has no
 * integer wide enough to carry nano-units without losing the last digits.
 */
export function toReviewJob(row: ReviewJobRow): ReviewJob {
  return {
    id: row.id,
    submissionId: row.submissionId,
    state: row.state,
    attempt: row.attempt,
    maxAttempts: row.maxAttempts,
    mode: row.mode,
    synthetic: row.synthetic,
    verdict: row.verdict,
    provider: row.provider,
    model: row.model,
    reasoningEffort: row.reasoningEffort,
    skillVersion: row.skillVersion,
    schemaVersion: row.schemaVersion,
    providerResponseId: row.providerResponseId,
    usage: row.usage,
    cost: toCost(row),
    onholdReason: row.onholdReason,
    progress: row.progress,
    reportState: row.reportState,
    reportAttempts: row.reportAttempts,
    reportLastAttemptAt: row.reportLastAttemptAt?.toISOString() ?? null,
    errorCode: row.errorCode,
    errorId: row.errorId,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Maps a joined list row onto the shape the overview reads.
 *
 * @param entry - The job with its submission's name, address and status, and
 * the shop the submission was admitted as.
 * @returns The list item.
 */
export function toReviewJobListItem(entry: {
  job: ReviewJobRow;
  shopName: string;
  shopUrl: string;
  submissionStatus: string;
  shopId: number | null;
}): ReviewJobListItem {
  return {
    ...toReviewJob(entry.job),
    shopName: entry.shopName,
    shopUrl: entry.shopUrl,
    submissionStatus: entry.submissionStatus,
    shopId: entry.shopId,
  };
}

/**
 * Maps an audit row onto the shape the dashboard reads.
 *
 * @param row - The stored entry.
 * @returns The entry with timestamps as ISO strings.
 */
function toReviewEvent(row: ReviewEventRow): ReviewEvent {
  return {
    id: row.id,
    jobId: row.jobId,
    attempt: row.attempt,
    state: row.state,
    event: row.event,
    detail: row.detail,
    errorId: row.errorId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Maps a job and its audit trail onto the detail view.
 *
 * @param row - The stored job.
 * @param events - The job's audit entries.
 * @param attempts - `true` to include the itemized attempt breakdown.
 * @returns The job, its trail and the validated result.
 *
 * @remarks
 * The validated result is included because the dashboard offers to apply the
 * proposed rejection texts from it. It has passed the contract, so it holds no
 * markup and no provider payload.
 */
export function toReviewJobDetail(row: ReviewJobRow, events: ReviewEventRow[]): ReviewJobDetail {
  return {
    ...toReviewJob(row),
    events: events.map(toReviewEvent),
    result: row.result ?? null,
  };
}
