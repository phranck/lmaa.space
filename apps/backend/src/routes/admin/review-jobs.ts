import { eq } from "drizzle-orm";
import { Hono } from "hono";

import type { ReviewCost } from "@lmaa/shared";

import { db } from "../../db/client.js";
import { reviewJobs } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { CURRENT_REVIEW_RATE_CARD, toReviewDisplayAmount } from "../../lib/review-cost.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { getSubmissionStatus } from "../../repositories/admin-submissions.js";
import {
  cancelReviewJob,
  countReviewJobsByState,
  readReviewSpendTotals,
  enqueueReviewJob,
  getReviewJob,
  getReviewJobBySubmission,
  listReviewEvents,
  listReviewJobsWithSubmission,
  retryReviewJob,
} from "../../repositories/review-jobs.js";
import { listReviewModels } from "../../services/review/models.js";
import {
  toReviewJob,
  toReviewJobDetail,
  toReviewJobListItem,
} from "../../services/review/read-model.js";

/**
 * Admin routes for the automated review of shop submissions.
 *
 * @remarks
 * Every route is admin-only. The automation decides what a shop directory
 * publishes, so reading its trail and retrying its work are not moderator
 * actions.
 */
export const reviewJobRoutes = new Hono<{ Variables: AuthVariables }>();

reviewJobRoutes.use("*", requireAdmin);

// GET /api/admin/review-jobs — every automated check, newest first
reviewJobRoutes.get("/review-jobs", async (c) => {
  const rows = await listReviewJobsWithSubmission();
  return ok(c, rows.map(toReviewJobListItem));
});

// GET /api/admin/review/models — models the automation can be configured to use
reviewJobRoutes.get("/review/models", async (c) => {
  return ok(c, await listReviewModels());
});

// GET /api/admin/review-jobs/spend — what the automation has cost in total
reviewJobRoutes.get("/review-jobs/spend", async (c) => {
  const totals = await readReviewSpendTotals();
  const shown = (totalNano: bigint): ReviewCost => {
    const cost: ReviewCost = {
      totalNano: totalNano.toString(),
      currency: totals.currency,
      rateCardVersion: CURRENT_REVIEW_RATE_CARD.version,
      complete: totals.complete,
      missingDimensions: [],
    };
    const display = toReviewDisplayAmount(cost);
    return { ...cost, displayTotalNano: display.totalNano, displayCurrency: display.currency };
  };

  return ok(c, { total: shown(totals.totalNano), today: shown(totals.todayNano) });
});

// GET /api/admin/review-jobs/queue — how much work is outstanding
reviewJobRoutes.get("/review-jobs/queue", async (c) => {
  const counts = await countReviewJobsByState();
  return ok(c, counts);
});

// GET /api/admin/submissions/:id/review — the job of one submission
reviewJobRoutes.get("/submissions/:id/review", async (c) => {
  const submissionId = parseId(c.req.param("id"));
  if (!submissionId) return fail(c, 400, "Invalid id");

  const job = await getReviewJobBySubmission(submissionId);
  if (!job) return ok(c, null);

  const events = await listReviewEvents(job.id);
  return ok(c, toReviewJobDetail(job, events));
});

// POST /api/admin/submissions/:id/review — queue a review for an existing submission
reviewJobRoutes.post("/submissions/:id/review", async (c) => {
  const submissionId = parseId(c.req.param("id"));
  if (!submissionId) return fail(c, 400, "Invalid id");

  const status = await getSubmissionStatus(submissionId);
  if (!status) return fail(c, 404, "Submission not found");

  // A decided submission is not re-reviewed. Re-opening one is a moderation
  // action of its own, and doing it here would let an automated run overwrite
  // a decision somebody already made.
  if (status === "approved" || status === "rejected") {
    return fail(c, 409, "Entschiedene Vorschläge werden nicht erneut automatisch geprüft");
  }

  const created = await enqueueReviewJob(db, submissionId);
  if (created) return ok(c, toReviewJob(created));

  // The partial unique index refused the insert, which means a job is already
  // active. Returning it makes the call idempotent rather than an error.
  const existing = await getReviewJobBySubmission(submissionId);
  return existing ? ok(c, toReviewJob(existing)) : fail(c, 409, "Es läuft bereits eine Prüfung");
});

// POST /api/admin/review-jobs/:id/retry — run a finished job again
reviewJobRoutes.post("/review-jobs/:id/retry", async (c) => {
  const jobId = parseId(c.req.param("id"));
  if (!jobId) return fail(c, 400, "Invalid id");

  const job = await retryReviewJob(jobId);
  if (!job) return fail(c, 409, "Nur abgeschlossene Prüfungen lassen sich erneut starten");
  return ok(c, toReviewJob(job));
});

// POST /api/admin/review-jobs/:id/cancel — stop a job that has not finished
reviewJobRoutes.post("/review-jobs/:id/cancel", async (c) => {
  const jobId = parseId(c.req.param("id"));
  if (!jobId) return fail(c, 400, "Invalid id");

  const job = await cancelReviewJob(jobId);
  if (!job) return fail(c, 409, "Diese Prüfung ist bereits abgeschlossen");
  return ok(c, toReviewJob(job));
});

// POST /api/admin/review-jobs/:id/report/retry — send the report again
reviewJobRoutes.post("/review-jobs/:id/report/retry", async (c) => {
  const jobId = parseId(c.req.param("id"));
  if (!jobId) return fail(c, 400, "Invalid id");

  const job = await getReviewJob(jobId);
  if (!job) return fail(c, 404, "Prüfung nicht gefunden");
  if (job.state !== "completed" && job.state !== "failed") {
    return fail(c, 409, "Der Bericht entsteht erst, wenn die Prüfung abgeschlossen ist");
  }

  // Putting the report back to pending is all this does. The worker picks it up
  // on its next tick, which keeps one path for sending and one for retrying.
  const [updated] = await db
    .update(reviewJobs)
    .set({ reportState: "pending", reportError: null, updatedAt: new Date() })
    .where(eq(reviewJobs.id, jobId))
    .returning();

  return ok(c, toReviewJob(updated));
});
