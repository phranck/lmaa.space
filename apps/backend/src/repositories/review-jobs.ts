import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  max,
  notInArray,
  or,
  sql,
  sum,
} from "drizzle-orm";

import {
  ACTIVE_REVIEW_JOB_STATES,
  REVIEW_APPLIED_EVENT,
  TERMINAL_REVIEW_JOB_STATES,
  canTransitionReviewJob,
} from "@lmaa/shared";
import type {
  ReviewAttemptRecord,
  ReviewCost,
  ReviewEvidenceSource,
  ReviewJobState,
  ReviewReportState,
  ReviewUsage,
  ReviewVerdict,
} from "@lmaa/shared";

import { db } from "../db/client.js";
import { reviewEvents, reviewJobs, reviewSpend, shops, submissions } from "../db/schema.js";
import type { ReviewEventRow, ReviewJobRow } from "../db/schema.js";
import { DEFAULT_REVIEW_RATE_CARD } from "../lib/review-cost.js";

/** Any transaction or the plain connection, so callers can join an existing one. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Fields a caller may set when a job moves to a new state.
 */
export interface ReviewJobPatch {
  verdict?: ReviewVerdict | null;
  provider?: string | null;
  model?: string | null;
  reasoningEffort?: string | null;
  skillVersion?: string | null;
  schemaVersion?: string | null;
  providerResponseId?: string | null;
  /**
   * Sets the attempt counter outright.
   *
   * @remarks
   * Only the worker sets this, and only when it had to submit a second batch
   * because the first could not be resumed. Claiming a job no longer counts an
   * attempt, since a restart resumes the same batch; submitting does, because
   * that is a fresh ask of the provider.
   */
  attempt?: number;
  result?: unknown;
  evidence?: ReviewEvidenceSource[];
  usage?: ReviewUsage | null;
  cost?: ReviewCost | null;
  onholdReason?: string | null;
  errorCode?: string | null;
  errorId?: string | null;
  reportState?: ReviewReportState;
  /** When the job may next be picked up, used for retry backoff. */
  nextRunAt?: Date;
  /** Clears the lease so no worker holds the job any more. */
  releaseLease?: boolean;
  /** Stamps `finishedAt`, which terminal transitions do. */
  finished?: boolean;
  /** Appends one attempt record to the itemized breakdown. */
  appendAttempt?: ReviewAttemptRecord;
}

/**
 * Raised when a transition the state machine forbids is attempted.
 */
export class InvalidReviewTransitionError extends Error {
  constructor(
    readonly jobId: number,
    readonly from: ReviewJobState,
    readonly to: ReviewJobState,
  ) {
    super(`Review job ${jobId} cannot move from ${from} to ${to}`);
    this.name = "InvalidReviewTransitionError";
  }
}

/**
 * Creates the initial review job for a submission.
 *
 * @param executor - Transaction the submission is being created in.
 * @param submissionId - Submission the job belongs to.
 * @param options.maxAttempts - Attempts before the job gives up.
 * @param options.synthetic - `true` for fixtures, which never send a report.
 * @returns The created job, or `null` when an active job already exists.
 *
 * @remarks
 * Called inside the same transaction as the submission insert, so a committed
 * submission always has exactly one job and a failure to create the job rolls
 * the submission back with it.
 *
 * The duplicate case is handled by the partial unique index rather than by
 * reading first, because two concurrent enqueues would both read "no active
 * job" before either wrote one.
 */
export async function enqueueReviewJob(
  executor: Executor,
  submissionId: number,
  options: { maxAttempts?: number; synthetic?: boolean } = {},
): Promise<ReviewJobRow | null> {
  const [row] = await executor
    .insert(reviewJobs)
    .values({
      submissionId,
      state: "queued",
      maxAttempts: options.maxAttempts,
      synthetic: options.synthetic ?? false,
    })
    .onConflictDoNothing()
    .returning();

  return row ?? null;
}

/**
 * Writes one immutable audit entry.
 *
 * @param executor - Transaction to write in, so the entry commits with the change it describes.
 * @param entry - What happened.
 *
 * @remarks
 * `detail` is truncated rather than trusted to be short. It carries provider
 * and validation messages, and an unbounded one would let a single job fill the
 * table.
 */
export async function recordReviewEvent(
  executor: Executor,
  entry: {
    jobId: number;
    attempt: number;
    state: ReviewJobState;
    event: string;
    detail?: string | null;
    errorId?: string | null;
  },
): Promise<void> {
  await executor.insert(reviewEvents).values({
    jobId: entry.jobId,
    attempt: entry.attempt,
    state: entry.state,
    event: entry.event,
    detail: entry.detail ? entry.detail.slice(0, 4000) : null,
    errorId: entry.errorId ?? null,
  });
}

/**
 * What the attempt counter reads after a worker has claimed a job.
 *
 * @param attempt - What it reads now.
 * @param providerResponseId - The batch this job already has with the provider,
 * or `null` where it has none.
 * @returns The counter after the claim.
 *
 * @remarks
 * A job carrying a batch id is one this claim resumes rather than starts, so it
 * costs no attempt. The counter exists to stop a check that keeps failing on
 * its own terms, and a worker restart says nothing about the shop.
 *
 * Two containers exist during a deployment, so the new one takes the job over
 * whilst the old one is still waiting on the provider. A batch runs for up to
 * ninety minutes and a lease holds twenty, which is why every deployment inside
 * that window used to spend an attempt: job 38 reached five of five with three
 * submissions and not one token read.
 *
 * A batch that could not be resumed and had to be submitted again does count,
 * and the worker records that where it submits.
 */
export function attemptAfterClaim(attempt: number, providerResponseId: string | null): number {
  return providerResponseId ? attempt : attempt + 1;
}

/**
 * Takes the next job that is due, if any.
 *
 * @param owner - Identifier of the claiming worker, for the audit trail.
 * @param leaseMs - How long the claim holds before another worker may take over.
 * @returns The claimed job, or `null` when nothing is due.
 *
 * @remarks
 * One statement does the whole claim, so two workers cannot both take the same
 * job. The inner select locks the row it picks and skips rows another worker
 * already holds.
 *
 * The same statement recovers a job whose lease has expired, which is what a
 * crashed worker leaves behind. That counts as a fresh attempt, because the
 * previous one may have got arbitrarily far before it died.
 */
export async function claimNextReviewJob(
  owner: string,
  leaseMs: number,
): Promise<ReviewJobRow | null> {
  return db.transaction(async (tx) => {
    const now = new Date();

    // The candidate row is locked and rows another worker already holds are
    // skipped, so two workers cannot take the same job. Everything after this
    // runs against a row this transaction owns.
    const [candidate] = await tx
      .select({
        id: reviewJobs.id,
        attempt: reviewJobs.attempt,
        providerResponseId: reviewJobs.providerResponseId,
      })
      .from(reviewJobs)
      .where(
        and(
          lt(reviewJobs.attempt, reviewJobs.maxAttempts),
          or(
            and(eq(reviewJobs.state, "queued"), lte(reviewJobs.nextRunAt, now)),
            // A lease that has run out is what a crashed worker leaves behind.
            and(
              inArray(reviewJobs.state, ["running", "provider_waiting", "applying"]),
              lt(reviewJobs.leaseExpiresAt, now),
            ),
          ),
        ),
      )
      .orderBy(asc(reviewJobs.nextRunAt), asc(reviewJobs.id))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;

    const [row] = await tx
      .update(reviewJobs)
      .set({
        state: "running",
        // The row is locked, so reading the counter and writing it back cannot
        // race with a second worker.
        attempt: attemptAfterClaim(candidate.attempt, candidate.providerResponseId),
        leaseOwner: owner,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(reviewJobs.id, candidate.id))
      .returning();

    return row ?? null;
  });
}

/**
 * Records what a running job is doing right now.
 *
 * @param jobId - Job to describe.
 * @param owner - Worker that holds the claim, so a worker that has lost the
 * job cannot overwrite what its successor writes.
 * @param step - One line about the current step, already fit to be read.
 *
 * @remarks
 * Overwritten rather than appended, because this answers "what is happening
 * now" and not "what happened". The trail of what happened is `review_events`,
 * which stays deliberately coarse so that a run of twenty searches does not
 * write twenty audit entries.
 */
export async function recordReviewProgress(
  jobId: number,
  owner: string,
  step: string,
): Promise<void> {
  await db
    .update(reviewJobs)
    .set({ progress: step.slice(0, 200), updatedAt: new Date() })
    .where(and(eq(reviewJobs.id, jobId), eq(reviewJobs.leaseOwner, owner)));
}

/**
 * Writes one attempt's spend into the ledger.
 *
 * @param executor - Transaction the attempt is being recorded in, so the money
 * and the attempt commit together.
 * @param job - The job the attempt belonged to, for its submission and kind.
 * @param attempt - The finished attempt.
 *
 * @remarks
 * Called from the two places that append an attempt record, so no attempt can
 * be recorded without its cost being booked. The ledger is what the daily
 * ceiling and the spend total read, because it survives the deletion of the
 * suggestion the check ran on.
 */
async function bookSpend(
  executor: Executor,
  job: { id: number; submissionId: number; synthetic: boolean },
  attempt: ReviewAttemptRecord,
): Promise<void> {
  await executor.insert(reviewSpend).values({
    jobId: job.id,
    submissionId: job.submissionId,
    attempt: attempt.attempt,
    model: attempt.model,
    synthetic: job.synthetic,
    costNano: BigInt(attempt.cost.totalNano),
    costCurrency: attempt.cost.currency,
    costRateCardVersion: attempt.cost.rateCardVersion,
    costComplete: attempt.cost.complete,
    spentAt: new Date(attempt.finishedAt),
  });
}

/**
 * Books what an attempt spent on a job that has already finished.
 *
 * @param jobId - Job the attempt belongs to.
 * @param attempt - The attempt record, including its usage and its cost.
 * @param usage - Usage of the whole job, including this attempt.
 * @param cost - Cost of the whole job, including this attempt.
 *
 * @remarks
 * Exists for the one case where an attempt outlives its job: a cancellation
 * ends the job at once, and the run that was in flight reports what it had
 * already spent afterwards. Booking it is not optional, because those tokens
 * were billed, and a check that hid them would understate both the overview and
 * the daily ceiling. The state is deliberately left untouched, so this cannot
 * revive a finished job.
 */
export async function bookAttemptOnFinishedJob(
  jobId: number,
  attempt: ReviewAttemptRecord,
  usage: ReviewUsage,
  cost: ReviewCost,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        attempts: reviewJobs.attempts,
        state: reviewJobs.state,
        submissionId: reviewJobs.submissionId,
        synthetic: reviewJobs.synthetic,
      })
      .from(reviewJobs)
      .where(eq(reviewJobs.id, jobId))
      .for("update");

    if (!current) return;

    await bookSpend(
      tx,
      { id: jobId, submissionId: current.submissionId, synthetic: current.synthetic },
      attempt,
    );

    await tx
      .update(reviewJobs)
      .set({
        attempts: [...current.attempts, attempt],
        usage,
        costNano: BigInt(cost.totalNano),
        costCurrency: cost.currency,
        costRateCardVersion: cost.rateCardVersion,
        costComplete: cost.complete,
        costMissingDimensions: cost.missingDimensions,
        progress: null,
        updatedAt: new Date(),
      })
      .where(eq(reviewJobs.id, jobId));

    await recordReviewEvent(tx, {
      jobId,
      attempt: attempt.attempt,
      state: current.state,
      event: "attempt.booked",
      detail: `Abgebrochener Versuch verbucht: ${formatBookedCost(cost)}`,
    });
  });
}

function formatBookedCost(cost: ReviewCost): string {
  const amount = Number(BigInt(cost.totalNano)) / 1_000_000_000;
  return `${amount.toFixed(4)} ${cost.currency}`;
}

/**
 * Extends the lease on a running job.
 *
 * @param jobId - Job to extend.
 * @param owner - Worker that holds the claim.
 * @param leaseMs - New lease duration from now.
 * @returns `true` when this worker still held the job.
 *
 * @remarks
 * Returning `false` means another worker has taken over, which happens when a
 * run outlives its lease. The caller stops rather than writing a result that a
 * second worker is also about to write.
 */
export async function heartbeatReviewJob(
  jobId: number,
  owner: string,
  leaseMs: number,
): Promise<boolean> {
  const rows = await db
    .update(reviewJobs)
    .set({ leaseExpiresAt: new Date(Date.now() + leaseMs), updatedAt: new Date() })
    .where(and(eq(reviewJobs.id, jobId), eq(reviewJobs.leaseOwner, owner)))
    .returning({ id: reviewJobs.id });

  return rows.length > 0;
}

function buildUpdate(patch: ReviewJobPatch, to: ReviewJobState): Record<string, unknown> {
  const update: Record<string, unknown> = { state: to, updatedAt: new Date() };

  if (patch.verdict !== undefined) update.verdict = patch.verdict;
  if (patch.provider !== undefined) update.provider = patch.provider;
  if (patch.model !== undefined) update.model = patch.model;
  if (patch.reasoningEffort !== undefined) update.reasoningEffort = patch.reasoningEffort;
  if (patch.skillVersion !== undefined) update.skillVersion = patch.skillVersion;
  if (patch.schemaVersion !== undefined) update.schemaVersion = patch.schemaVersion;
  if (patch.providerResponseId !== undefined) update.providerResponseId = patch.providerResponseId;
  if (patch.attempt !== undefined) update.attempt = patch.attempt;
  if (patch.result !== undefined) update.result = patch.result;
  if (patch.evidence !== undefined) update.evidence = patch.evidence;
  if (patch.usage !== undefined) update.usage = patch.usage;
  if (patch.onholdReason !== undefined) update.onholdReason = patch.onholdReason;
  if (patch.errorCode !== undefined) update.errorCode = patch.errorCode;
  if (patch.errorId !== undefined) update.errorId = patch.errorId;
  if (patch.reportState !== undefined) update.reportState = patch.reportState;
  if (patch.nextRunAt !== undefined) update.nextRunAt = patch.nextRunAt;

  // The current step describes a run in flight, so it is cleared the moment
  // there is no run in flight. Leaving it would show a finished check as still
  // reading a page.
  const stillRunning = to === "running" || to === "provider_waiting" || to === "applying";
  if (!stillRunning) update.progress = null;

  if (patch.cost !== undefined && patch.cost !== null) {
    update.costNano = BigInt(patch.cost.totalNano);
    update.costCurrency = patch.cost.currency;
    update.costRateCardVersion = patch.cost.rateCardVersion;
    update.costComplete = patch.cost.complete;
    update.costMissingDimensions = patch.cost.missingDimensions;
  }

  if (patch.releaseLease) {
    update.leaseOwner = null;
    update.leaseExpiresAt = null;
  }

  if (patch.finished) update.finishedAt = new Date();

  return update;
}

/**
 * Moves a job to a new state and records the change.
 *
 * @param jobId - Job to move.
 * @param to - Requested state.
 * @param patch - Fields to write alongside the transition.
 * @param event - Audit label for the change.
 * @returns The updated job.
 * @throws {InvalidReviewTransitionError} When the state machine forbids the move.
 *
 * @remarks
 * The current state is read inside the transaction and the transition checked
 * against it, so a job that changed underneath the caller is refused rather
 * than overwritten. The audit entry is written in the same transaction, which
 * is what makes the trail complete rather than best-effort.
 */
export async function transitionReviewJob(
  jobId: number,
  to: ReviewJobState,
  patch: ReviewJobPatch,
  event: { name: string; detail?: string | null; errorId?: string | null },
): Promise<ReviewJobRow> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        state: reviewJobs.state,
        attempt: reviewJobs.attempt,
        attempts: reviewJobs.attempts,
        submissionId: reviewJobs.submissionId,
        synthetic: reviewJobs.synthetic,
      })
      .from(reviewJobs)
      .where(eq(reviewJobs.id, jobId))
      .for("update");

    if (!current) throw new Error(`Review job ${jobId} does not exist`);
    if (current.state !== to && !canTransitionReviewJob(current.state, to)) {
      throw new InvalidReviewTransitionError(jobId, current.state, to);
    }

    const update = buildUpdate(patch, to);
    if (patch.appendAttempt) {
      update.attempts = [...current.attempts, patch.appendAttempt];
      await bookSpend(
        tx,
        { id: jobId, submissionId: current.submissionId, synthetic: current.synthetic },
        patch.appendAttempt,
      );
    }

    const [row] = await tx
      .update(reviewJobs)
      .set(update)
      .where(eq(reviewJobs.id, jobId))
      .returning();

    await recordReviewEvent(tx, {
      jobId,
      attempt: current.attempt,
      state: to,
      event: event.name,
      detail: event.detail,
      errorId: event.errorId,
    });

    return row;
  });
}

/**
 * Finalizes jobs that have used up their attempts.
 *
 * @returns The jobs that were finalized.
 *
 * @remarks
 * A job whose last attempt failed goes back to `queued` with a retry time, and
 * the claim query then refuses it because it has no attempts left. This sweep
 * is what turns that into a terminal outcome with the safe verdict, rather than
 * leaving it queued forever.
 */
export async function finalizeExhaustedReviewJobs(): Promise<ReviewJobRow[]> {
  return db.transaction(async (tx) => {
    const exhausted = await tx
      .select()
      .from(reviewJobs)
      .where(
        and(
          notInArray(reviewJobs.state, ["completed", "failed", "cancelled"]),
          gte(reviewJobs.attempt, reviewJobs.maxAttempts),
          // A job another worker still holds is left alone. Finishing it here
          // would clear that worker's lease, its heartbeat would notice, and
          // the run it is in the middle of would be aborted mid-request. That
          // happened in production with two instances: one finished the job as
          // exhausted whilst the other was still waiting on the provider.
          or(isNull(reviewJobs.leaseExpiresAt), lt(reviewJobs.leaseExpiresAt, new Date())),
        ),
      )
      .for("update", { skipLocked: true });

    const finalized: ReviewJobRow[] = [];
    for (const job of exhausted) {
      const now = new Date();
      const [row] = await tx
        .update(reviewJobs)
        .set({
          state: "failed",
          verdict: job.verdict ?? "onhold",
          onholdReason:
            job.onholdReason ??
            "Die automatische Prüfung ist nach allen zulässigen Versuchen nicht zu einem Ergebnis gekommen.",
          errorCode: job.errorCode ?? "REVIEW_ATTEMPTS_EXHAUSTED",
          leaseOwner: null,
          leaseExpiresAt: null,
          finishedAt: job.finishedAt ?? now,
          updatedAt: now,
        })
        .where(eq(reviewJobs.id, job.id))
        .returning();
      if (row) finalized.push(row);
    }

    return finalized;
  });
}

/**
 * Sums what was spent on one UTC day.
 *
 * @param day - Any moment within the day; defaults to now.
 * @returns The total in nano-units.
 *
 * @remarks
 * Read from the ledger rather than from the jobs, so an attempt counts as soon
 * as it has finished, a cancelled run counts for what it managed to spend, and
 * a deleted suggestion does not take its spending out of the ceiling.
 */
export async function sumReviewCostForDay(day: Date = new Date()): Promise<bigint> {
  const from = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0),
  );
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({ total: sum(reviewSpend.costNano) })
    .from(reviewSpend)
    .where(and(gte(reviewSpend.spentAt, from), lt(reviewSpend.spentAt, to)));

  return row?.total ? BigInt(row.total) : 0n;
}

/**
 * What has been spent on automated checks in total.
 *
 * @returns The total in nano-units, how much of it was spent today, how many
 * distinct checks it covers, the currency it is counted in, and whether every
 * amount in it is complete.
 *
 * @remarks
 * Includes checks whose suggestion has since been deleted, which is the whole
 * reason the ledger exists. Probe runs are counted too, because they are billed
 * like any other run.
 *
 * The count is of distinct jobs rather than of rows. A row is one attempt, so a
 * check that was retried spent twice whilst still being one check, and dividing
 * the total by the row count would report what an attempt costs rather than
 * what a check costs.
 */
export async function readReviewSpendTotals(): Promise<{
  totalNano: bigint;
  todayNano: bigint;
  checkCount: number;
  currency: string;
  complete: boolean;
}> {
  const [row] = await db
    .select({
      total: sum(reviewSpend.costNano),
      checks: countDistinct(reviewSpend.jobId),
      currency: max(reviewSpend.costCurrency),
      incomplete: count(sql`CASE WHEN ${reviewSpend.costComplete} = false THEN 1 END`),
    })
    .from(reviewSpend);

  return {
    totalNano: row?.total ? BigInt(row.total) : 0n,
    todayNano: await sumReviewCostForDay(),
    checkCount: row?.checks ?? 0,
    currency: row?.currency ?? DEFAULT_REVIEW_RATE_CARD.currency,
    complete: (row?.incomplete ?? 0) === 0,
  };
}

/**
 * Loads the current job of a submission.
 *
 * @param submissionId - Submission to look up.
 * @returns The newest job, or `null` when the submission has none.
 */
export async function getReviewJobBySubmission(submissionId: number): Promise<ReviewJobRow | null> {
  const [row] = await db
    .select()
    .from(reviewJobs)
    .where(eq(reviewJobs.submissionId, submissionId))
    .orderBy(desc(reviewJobs.id))
    .limit(1);
  return row ?? null;
}

/**
 * Loads one job by id.
 *
 * @param jobId - Job to load.
 * @returns The job, or `null` when it does not exist.
 */
export async function getReviewJob(jobId: number): Promise<ReviewJobRow | null> {
  const [row] = await db.select().from(reviewJobs).where(eq(reviewJobs.id, jobId)).limit(1);
  return row ?? null;
}

/**
 * Loads the audit trail of one job.
 *
 * @param jobId - Job whose entries to load.
 * @returns The entries in the order they were written.
 */
export async function listReviewEvents(jobId: number): Promise<ReviewEventRow[]> {
  return db
    .select()
    .from(reviewEvents)
    .where(eq(reviewEvents.jobId, jobId))
    .orderBy(asc(reviewEvents.id));
}

/**
 * Loads the jobs of several submissions at once.
 *
 * @param submissionIds - Submissions to look up.
 * @returns The newest job per submission, keyed by submission id.
 *
 * @remarks
 * Used by the submission list, which would otherwise issue one query per row.
 */
export async function loadReviewJobMap(
  submissionIds: readonly number[],
): Promise<Map<number, ReviewJobRow>> {
  if (submissionIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(reviewJobs)
    .where(inArray(reviewJobs.submissionId, [...submissionIds]))
    .orderBy(asc(reviewJobs.submissionId), desc(reviewJobs.id));

  const map = new Map<number, ReviewJobRow>();
  for (const row of rows) {
    if (!map.has(row.submissionId)) map.set(row.submissionId, row);
  }
  return map;
}

/**
 * Loads the review jobs with the submission each belongs to.
 *
 * @param limit - Largest number of rows to return.
 * @returns The newest jobs first, with the shop name, address, status, the shop
 * the submission was admitted as, and whether the automation applied the
 * verdict itself.
 *
 * @remarks
 * Joined rather than looked up per row, because the overview shows a shop name
 * next to every check and one query per row would grow with the list. The shop
 * is joined on the left, because a submission still under moderation has none.
 *
 * Whether the automation acted is read from the audit trail rather than from
 * the submission's status, because the status says what the submission is and
 * not who decided it. A `result.applied` entry is written only where the
 * automation set the status itself, so an admission a person granted after
 * reading the check does not read as one the automation made. Asked as an
 * `EXISTS` rather than by loading the events, which the list does not need for
 * anything else.
 */
export async function listReviewJobsWithSubmission(limit = 200) {
  return db
    .select({
      job: reviewJobs,
      shopName: submissions.shopName,
      shopUrl: submissions.shopUrl,
      submissionStatus: submissions.status,
      shopId: shops.id,
      appliedByAutomation: sql<boolean>`EXISTS (
        SELECT 1 FROM ${reviewEvents}
        WHERE ${reviewEvents.jobId} = ${reviewJobs.id}
          AND ${reviewEvents.event} = ${REVIEW_APPLIED_EVENT}
      )`,
    })
    .from(reviewJobs)
    .innerJoin(submissions, eq(submissions.id, reviewJobs.submissionId))
    .leftJoin(shops, eq(shops.submissionId, submissions.id))
    .orderBy(desc(reviewJobs.id))
    .limit(limit);
}

/**
 * Cancels a job that has not finished.
 *
 * @param jobId - Job to cancel.
 * @returns The cancelled job, or `null` when it was already terminal.
 *
 * @remarks
 * Cancelling releases the lease, so a worker still holding the job finds out on
 * its next heartbeat and stops instead of writing a result nobody asked for.
 */
export async function cancelReviewJob(jobId: number): Promise<ReviewJobRow | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(reviewJobs)
      .where(
        and(
          eq(reviewJobs.id, jobId),
          notInArray(reviewJobs.state, ["completed", "failed", "cancelled"]),
        ),
      )
      .for("update");

    if (!current) return null;

    const now = new Date();
    const [row] = await tx
      .update(reviewJobs)
      .set({
        state: "cancelled",
        leaseOwner: null,
        leaseExpiresAt: null,
        finishedAt: current.finishedAt ?? now,
        // A report nobody asked for is not queued for a check that was stopped.
        reportState: current.reportState === "pending" ? "skipped" : current.reportState,
        updatedAt: now,
      })
      .where(eq(reviewJobs.id, jobId))
      .returning();

    return row ?? null;
  });
}

/**
 * Puts a finished job back into the queue.
 *
 * @param jobId - Job to retry.
 * @param extraAttempts - Attempts to grant on top of those already used.
 * @returns The requeued job, or `null` when it is not in a terminal state.
 *
 * @remarks
 * The attempt counter is not reset. Keeping it means the itemized cost of the
 * check still covers everything that was spent on it, including the attempts
 * that led to the retry.
 */
export async function retryReviewJob(
  jobId: number,
  extraAttempts = 1,
): Promise<ReviewJobRow | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: reviewJobs.id, attempt: reviewJobs.attempt })
      .from(reviewJobs)
      .where(
        and(
          eq(reviewJobs.id, jobId),
          inArray(reviewJobs.state, ["completed", "failed", "cancelled"]),
        ),
      )
      .for("update");

    if (!current) return null;

    const [row] = await tx
      .update(reviewJobs)
      .set({
        state: "queued",
        maxAttempts: current.attempt + extraAttempts,
        nextRunAt: new Date(),
        verdict: null,
        result: null,
        evidence: [],
        onholdReason: null,
        provider: null,
        model: null,
        reasoningEffort: null,
        providerResponseId: null,
        errorCode: null,
        errorId: null,
        progress: null,
        startedAt: null,
        finishedAt: null,
        reportState: "pending",
        updatedAt: new Date(),
      })
      .where(eq(reviewJobs.id, jobId))
      .returning();

    return row ?? null;
  });
}

/**
 * Takes the next report that is due for delivery.
 *
 * @param backoffMs - Wait before a failed delivery is tried again.
 * @returns The job whose report to send, or `null` when none is due.
 *
 * @remarks
 * Reports live on the job rather than in an outbox of their own, so this claim
 * is the same shape as the job claim and shares its guarantee: one statement,
 * one winner.
 */
export async function claimReviewReport(backoffMs: number): Promise<ReviewJobRow | null> {
  return db.transaction(async (tx) => {
    const retryBefore = new Date(Date.now() - backoffMs);

    const [candidate] = await tx
      .select({ id: reviewJobs.id, reportAttempts: reviewJobs.reportAttempts })
      .from(reviewJobs)
      .where(
        and(
          eq(reviewJobs.synthetic, false),
          inArray(reviewJobs.state, ["completed", "failed"]),
          or(
            eq(reviewJobs.reportState, "pending"),
            and(
              eq(reviewJobs.reportState, "failed"),
              lt(reviewJobs.reportLastAttemptAt, retryBefore),
            ),
          ),
        ),
      )
      .orderBy(asc(reviewJobs.id))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;

    const now = new Date();
    const [row] = await tx
      .update(reviewJobs)
      .set({
        reportState: "sending",
        reportAttempts: candidate.reportAttempts + 1,
        reportLastAttemptAt: now,
        updatedAt: now,
      })
      .where(eq(reviewJobs.id, candidate.id))
      .returning();

    return row ?? null;
  });
}

/**
 * Records the outcome of a report delivery.
 *
 * @param jobId - Job whose report was sent.
 * @param state - `sent` or `failed`.
 * @param error - Redacted failure description, when it failed.
 */
export async function finishReviewReport(
  jobId: number,
  state: Extract<ReviewReportState, "sent" | "failed">,
  error?: string | null,
): Promise<void> {
  await db
    .update(reviewJobs)
    .set({ reportState: state, reportError: error ?? null, updatedAt: new Date() })
    .where(eq(reviewJobs.id, jobId));
}

/**
 * Marks a report as not needing delivery.
 *
 * @param jobId - Job whose report to skip.
 * @param reason - Why it is skipped, for the audit trail.
 */
export async function skipReviewReport(jobId: number, reason: string): Promise<void> {
  await db
    .update(reviewJobs)
    .set({ reportState: "skipped", reportError: reason, updatedAt: new Date() })
    .where(eq(reviewJobs.id, jobId));
}

/**
 * Counts jobs by state.
 *
 * @returns One entry per state that has at least one job.
 *
 * @remarks
 * Feeds the operational log line and the dashboard's queue indicator, both of
 * which only need the shape of the queue rather than its contents.
 */
export async function countReviewJobsByState(): Promise<Record<string, number>> {
  const rows = await db
    .select({ state: reviewJobs.state, count: count() })
    .from(reviewJobs)
    .groupBy(reviewJobs.state);

  return Object.fromEntries(rows.map((row) => [row.state, row.count]));
}

/**
 * Loads the submission a job belongs to.
 *
 * @param submissionId - Submission to load.
 * @returns The fields the review needs, or `null` when it no longer exists.
 */
export async function getSubmissionForReview(submissionId: number) {
  const [row] = await db
    .select({
      id: submissions.id,
      shopName: submissions.shopName,
      shopUrl: submissions.shopUrl,
      status: submissions.status,
      readyForReview: submissions.readyForReview,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  return row ?? null;
}

/**
 * States in which a job still owns work, for callers that filter on it.
 */
export const ACTIVE_STATES = ACTIVE_REVIEW_JOB_STATES;

/**
 * States a job can no longer leave, for callers that filter on it.
 */
export const TERMINAL_STATES = TERMINAL_REVIEW_JOB_STATES;

/**
 * Loads jobs that are neither finished nor cancelled.
 *
 * @returns The active jobs, oldest first.
 */
export async function listActiveReviewJobs(): Promise<ReviewJobRow[]> {
  return db
    .select()
    .from(reviewJobs)
    .where(and(inArray(reviewJobs.state, [...ACTIVE_REVIEW_JOB_STATES])))
    .orderBy(asc(reviewJobs.id));
}
