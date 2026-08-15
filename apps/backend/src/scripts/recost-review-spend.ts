/**
 * Recalculates what past automated checks cost and books the difference.
 *
 * @remarks
 * Attempts that ran on a model the rate card did not know were costed at zero,
 * which understated both the overview and the daily ceiling. The rate card now
 * prices every model the automation offers, so every stored attempt is priced
 * again from the usage it recorded.
 *
 * The ledger is append-only, so a correction is a further row carrying the
 * difference rather than an edit of the row that was wrong. The job keeps its
 * itemization, which is rewritten with the corrected amounts so the list and
 * the ledger agree.
 *
 * Usage:
 *
 * ```bash
 * npm run review:recost -w @lmaa/backend
 * npm run review:recost -w @lmaa/backend -- --apply
 * ```
 *
 * Without `--apply` nothing is written and the differences are printed.
 */
import { eq, sum } from "drizzle-orm";

import type { ReviewAttemptRecord } from "@lmaa/shared";

import { client, db } from "../db/client.js";
import { reviewJobs, reviewSpend } from "../db/schema.js";
import {
  calculateReviewCost,
  formatReviewCost,
  hasReviewPrices,
  sumReviewCosts,
} from "../lib/review-cost.js";

async function bookedFor(jobId: number, attempt: number): Promise<bigint> {
  const rows = await db
    .select({ total: sum(reviewSpend.costNano), attempt: reviewSpend.attempt })
    .from(reviewSpend)
    .where(eq(reviewSpend.jobId, jobId))
    .groupBy(reviewSpend.attempt);

  const row = rows.find((entry) => entry.attempt === attempt);
  return row?.total ? BigInt(row.total) : 0n;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const jobs = await db.select().from(reviewJobs);

  for (const job of jobs) {
    const corrected: ReviewAttemptRecord[] = [];
    let changed = false;

    for (const attempt of job.attempts) {
      if (!hasReviewPrices(attempt.model)) {
        corrected.push(attempt);
        continue;
      }

      const cost = calculateReviewCost(attempt.usage, attempt.model);
      const booked = await bookedFor(job.id, attempt.attempt);
      const delta = BigInt(cost.totalNano) - booked;

      corrected.push({ ...attempt, cost });
      if (delta === 0n) continue;

      changed = true;
      process.stdout.write(
        `Auftrag ${job.id}, Versuch ${attempt.attempt} auf ${attempt.model}: ` +
          `gebucht ${formatReviewCost({ ...cost, totalNano: booked.toString() })}, ` +
          `tatsächlich ${formatReviewCost(cost)}\n`,
      );

      if (!apply) continue;

      await db.insert(reviewSpend).values({
        jobId: job.id,
        submissionId: job.submissionId,
        attempt: attempt.attempt,
        model: attempt.model,
        synthetic: job.synthetic,
        costNano: delta > 0n ? delta : 0n,
        costCurrency: cost.currency,
        costRateCardVersion: cost.rateCardVersion,
        costComplete: cost.complete,
        spentAt: new Date(attempt.finishedAt),
      });
    }

    if (!changed || !apply) continue;

    const aggregate = sumReviewCosts(corrected.map((entry) => entry.cost));
    await db
      .update(reviewJobs)
      .set({
        attempts: corrected,
        costNano: BigInt(aggregate.totalNano),
        costCurrency: aggregate.currency,
        costRateCardVersion: aggregate.rateCardVersion,
        costComplete: aggregate.complete,
        costMissingDimensions: aggregate.missingDimensions,
        updatedAt: new Date(),
      })
      .where(eq(reviewJobs.id, job.id));
  }

  if (!apply) process.stdout.write("\nNichts geschrieben. Mit --apply anwenden.\n");
  await client.end();
}

void main();
