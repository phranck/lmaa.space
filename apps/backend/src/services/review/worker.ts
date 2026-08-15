import { randomUUID } from "node:crypto";
import { hostname } from "node:os";

import { REVIEW_RESULT_SCHEMA_VERSION, reviewResultSchema } from "@lmaa/contracts";
import type { ReviewResult } from "@lmaa/contracts";
import type { ReviewAttemptRecord, ReviewCost, ReviewJobState, ReviewVerdict } from "@lmaa/shared";

import { AnthropicReviewProvider } from "./anthropic-provider.js";
import { applyReviewResult } from "./apply.js";
import { MissingAdmissionCriteriaError, loadReviewRunContext } from "./context.js";
import { collectPaymentEvidence } from "./payment-evidence.js";
import type { ReviewProvider, ReviewProviderOutcome } from "./provider.js";
import { sendReviewReport } from "./report.js";
import { loadReviewSettings } from "./settings.js";
import type { ReviewSettings } from "./settings.js";
import { loadReviewSkill } from "./skill.js";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import type { ReviewJobRow } from "../../db/schema.js";
import { logger } from "../../lib/logger.js";
import { calculateReviewCost, sumReviewCosts, sumReviewUsage } from "../../lib/review-cost.js";
import {
  bookAttemptOnFinishedJob,
  claimNextReviewJob,
  claimReviewReport,
  finalizeExhaustedReviewJobs,
  finishReviewReport,
  getSubmissionForReview,
  heartbeatReviewJob,
  recordReviewProgress,
  recordReviewEvent,
  skipReviewReport,
  sumReviewCostForDay,
  transitionReviewJob,
} from "../../repositories/review-jobs.js";
import { recordBackgroundError } from "../background-errors.js";

/** How often the worker looks for work. */
const TICK_INTERVAL_MS = 30_000;

/** How long a claim holds before another worker may take the job over. */
const LEASE_MS = 20 * 60 * 1000;

/** How often the lease is extended while a provider call is in flight. */
const HEARTBEAT_INTERVAL_MS = 60_000;

/** How long a failed report waits before it is tried again. */
const REPORT_BACKOFF_MS = 10 * 60 * 1000;

/** Base delay between attempts, doubled per attempt. */
const RETRY_BASE_DELAY_MS = 2 * 60 * 1000;

/** Identifies this process in the lease, so a takeover is traceable. */
const WORKER_ID = `${hostname()}:${process.pid}`;

function retryDelayMs(attempt: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
}

function buildAttemptRecord(
  job: ReviewJobRow,
  provider: ReviewProvider,
  outcome: ReviewProviderOutcome,
  cost: ReviewCost,
  startedAt: Date,
): ReviewAttemptRecord {
  const outcomeKind: ReviewAttemptRecord["outcome"] =
    outcome.kind === "result"
      ? "succeeded"
      : outcome.kind === "refused"
        ? "refused"
        : outcome.kind === "invalid_output"
          ? "invalid_output"
          : outcome.kind === "budget_exceeded"
            ? "budget_exceeded"
            : "failed";

  return {
    attempt: job.attempt,
    provider: provider.name,
    model: outcome.model,
    effort: outcome.effort,
    providerResponseId: outcome.providerResponseId,
    stopReason: outcome.stopReason,
    usage: outcome.usage,
    cost,
    outcome: outcomeKind,
    errorCode: outcome.errorCode,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

/**
 * Adds up what a check has cost across all of its attempts.
 *
 * @param job - The job, whose `attempts` hold the finished ones.
 * @param latest - The attempt that has just finished.
 * @returns The aggregate for the whole check.
 */
function aggregateCost(job: ReviewJobRow, latest: ReviewAttemptRecord): ReviewCost {
  return sumReviewCosts([...job.attempts.map((entry) => entry.cost), latest.cost]);
}

interface TerminalOutcome {
  state: Extract<ReviewJobState, "completed" | "failed">;
  verdict: ReviewVerdict;
  onholdReason: string | null;
  errorCode: string | null;
  event: string;
  detail: string;
}

/**
 * Runs the automated review for shop submissions.
 *
 * @remarks
 * The worker owns the whole orchestration: it claims work under a lease, calls
 * the provider, validates what comes back, applies it through the moderation
 * domain and sends the report. The provider only runs one attempt, which is
 * what keeps a second provider from having to reimplement any of this.
 *
 * It runs inside the backend rather than as a separate service. The backend
 * already holds the database connection, the mail transport and a scheduler,
 * and a second deployment would duplicate all three for a process that spends
 * most of its life asleep.
 */
export class ReviewWorker {
  private running = false;
  private stopped = false;

  /**
   * @param createProvider - Builds the provider from the settings of this tick.
   * @param readSettings - Where the settings come from; defaults to the system
   * settings. A caller that wants to run a check under settings of its own, such
   * as the probe script, passes its own reader rather than editing what the
   * operator configured.
   */
  constructor(
    private readonly createProvider: (settings: ReviewSettings) => ReviewProvider,
    private readonly readSettings: () => Promise<ReviewSettings> = loadReviewSettings,
  ) {}

  /**
   * Does one round of work.
   *
   * @remarks
   * Housekeeping runs regardless of the automation mode, because a job that
   * exhausted its attempts and a report that has not gone out both need to
   * finish even after somebody switches automation off.
   */
  async tick(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;

    try {
      const settings = await this.readSettings();

      const exhausted = await finalizeExhaustedReviewJobs();
      for (const job of exhausted) {
        logger.warn(
          { jobId: job.id, submissionId: job.submissionId },
          "review job exhausted its attempts",
        );
      }

      await this.processOneReport(settings);

      if (settings.mode === "off") return;

      const provider = this.createProvider(settings);
      if (!provider.isConfigured()) {
        logger.warn("review worker idle: ANTHROPIC_API_KEY is not set");
        return;
      }

      const spentToday = await sumReviewCostForDay();
      if (spentToday >= settings.costLimitPerDayNano) {
        logger.warn(
          { spentToday: spentToday.toString(), limit: settings.costLimitPerDayNano.toString() },
          "review worker idle: daily cost ceiling reached",
        );
        return;
      }

      const job = await claimNextReviewJob(WORKER_ID, LEASE_MS, settings.mode);
      if (!job) return;

      await this.runJob(job, provider, settings);
    } finally {
      this.running = false;
    }
  }

  /**
   * Runs one claimed job to a conclusion.
   *
   * @param job - The claimed job.
   * @param provider - Provider to run the attempt on.
   * @param settings - Configuration this run uses.
   */
  private async runJob(
    job: ReviewJobRow,
    provider: ReviewProvider,
    settings: ReviewSettings,
  ): Promise<void> {
    const submission = await getSubmissionForReview(job.submissionId);
    if (!submission) {
      await transitionReviewJob(
        job.id,
        "cancelled",
        { releaseLease: true, finished: true, reportState: "skipped" },
        { name: "job.cancelled", detail: "Der Vorschlag existiert nicht mehr" },
      );
      return;
    }

    if (submission.status === "approved" || submission.status === "rejected") {
      await transitionReviewJob(
        job.id,
        "cancelled",
        { releaseLease: true, finished: true, reportState: "skipped" },
        { name: "job.cancelled", detail: "Der Vorschlag wurde bereits entschieden" },
      );
      return;
    }

    let context;
    try {
      context = await loadReviewRunContext();
    } catch (error) {
      if (error instanceof MissingAdmissionCriteriaError) {
        await this.finishJob(job, provider, null, settings, {
          state: "failed",
          verdict: "onhold",
          onholdReason:
            "Die Aufnahmekriterien konnten nicht geladen werden, deshalb wurde keine Prüfung durchgeführt.",
          errorCode: error.code,
          event: "job.failed",
          detail: error.message,
        });
        return;
      }
      throw error;
    }

    const skill = loadReviewSkill();
    const startedAt = new Date();

    // Read before the provider is asked, because the names live in the markup
    // and the provider's page fetch only returns extracted text.
    const paymentEvidence = await collectPaymentEvidence(submission.shopUrl);

    await transitionReviewJob(
      job.id,
      "provider_waiting",
      {
        provider: provider.name,
        model: provider.model,
        reasoningEffort: provider.effort,
        skillVersion: skill.version,
        schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
      },
      { name: "provider.started", detail: `${provider.name}/${provider.model}` },
    );

    const abort = new AbortController();
    const heartbeat = setInterval(() => {
      void heartbeatReviewJob(job.id, WORKER_ID, LEASE_MS).then((held) => {
        if (!held) abort.abort();
      });
    }, HEARTBEAT_INTERVAL_MS);

    let outcome: ReviewProviderOutcome;
    try {
      outcome = await provider.runReview({
        submissionId: submission.id,
        shopUrl: submission.shopUrl,
        shopName: submission.shopName,
        skill,
        context,
        costLimitNano: settings.costLimitPerCheckNano,
        paymentMethods: paymentEvidence.methods,
        signal: abort.signal,
        // A batch that a previous attempt already submitted is resumed rather
        // than submitted again, because the provider bills what it processed
        // whether or not anybody collected the answer.
        resumeBatchId: job.providerResponseId ?? undefined,
        onBatchCreated: (batchId) => {
          void transitionReviewJob(
            job.id,
            "provider_waiting",
            { providerResponseId: batchId },
            { name: "provider.submitted", detail: batchId },
          ).catch((error: unknown) => {
            logger.warn({ err: error, jobId: job.id }, "could not record the batch id");
          });
        },
        onProgress: (step) => {
          void recordReviewProgress(job.id, WORKER_ID, step).catch((error) => {
            logger.debug({ err: error, jobId: job.id }, "could not record review progress");
          });
        },
      });
    } finally {
      clearInterval(heartbeat);
    }

    // Every check is submitted as a batch, which the provider bills at half.
    const cost = calculateReviewCost(outcome.usage, outcome.model, undefined, "batch");
    const attemptRecord = buildAttemptRecord(job, provider, outcome, cost, startedAt);

    // A cancellation ends the job at once, so by the time the aborted run
    // reports back there is no state left to move. What it spent is booked
    // anyway, because the provider billed it either way.
    if (outcome.errorCode === "PROVIDER_ABORTED") {
      await bookAttemptOnFinishedJob(
        job.id,
        attemptRecord,
        sumReviewUsage([...job.attempts.map((entry) => entry.usage), outcome.usage]),
        aggregateCost(job, attemptRecord),
      );
      return;
    }

    if (outcome.kind === "result") {
      await this.handleResult(job, provider, outcome, attemptRecord, settings);
      return;
    }

    if (outcome.retryable && job.attempt < job.maxAttempts) {
      await transitionReviewJob(
        job.id,
        "queued",
        {
          appendAttempt: attemptRecord,
          usage: sumReviewUsage([...job.attempts.map((entry) => entry.usage), outcome.usage]),
          cost: aggregateCost(job, attemptRecord),
          providerResponseId: outcome.providerResponseId,
          errorCode: outcome.errorCode,
          nextRunAt: new Date(Date.now() + retryDelayMs(job.attempt)),
          releaseLease: true,
        },
        {
          name: "attempt.failed",
          detail: `${outcome.errorCode ?? "unbekannt"}: ${outcome.errorMessage ?? ""}`.trim(),
        },
      );
      return;
    }

    await this.finishJob(job, provider, attemptRecord, settings, {
      state: "failed",
      verdict: "onhold",
      onholdReason:
        outcome.kind === "refused"
          ? "Der Provider hat die Bearbeitung dieses Shops abgelehnt. Bitte manuell prüfen."
          : outcome.kind === "budget_exceeded"
            ? "Der Kostendeckel für diese Prüfung wurde erreicht, bevor ein Ergebnis vorlag."
            : (outcome.errorMessage ??
              "Die automatische Prüfung hat kein auswertbares Ergebnis geliefert."),
      errorCode: outcome.errorCode,
      event: "job.failed",
      detail: outcome.errorMessage ?? "",
    });
  }

  /**
   * Validates a provider result and applies it.
   *
   * @remarks
   * Validation happens before anything is written. A result that fails the
   * contract is treated exactly like a failed attempt, because a result nobody
   * checked is not a result.
   */
  private async handleResult(
    job: ReviewJobRow,
    provider: ReviewProvider,
    outcome: ReviewProviderOutcome,
    attemptRecord: ReviewAttemptRecord,
    settings: ReviewSettings,
  ): Promise<void> {
    const parsed = reviewResultSchema.safeParse(outcome.raw);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 8)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");

      if (job.attempt < job.maxAttempts) {
        await transitionReviewJob(
          job.id,
          "queued",
          {
            appendAttempt: { ...attemptRecord, outcome: "invalid_output" },
            cost: aggregateCost(job, attemptRecord),
            providerResponseId: outcome.providerResponseId,
            errorCode: "REVIEW_RESULT_INVALID",
            nextRunAt: new Date(Date.now() + retryDelayMs(job.attempt)),
            releaseLease: true,
          },
          { name: "result.invalid", detail: issues },
        );
        return;
      }

      await this.finishJob(
        job,
        provider,
        { ...attemptRecord, outcome: "invalid_output" },
        settings,
        {
          state: "failed",
          verdict: "onhold",
          onholdReason:
            "Das Ergebnis der automatischen Prüfung entsprach nicht dem vereinbarten Format.",
          errorCode: "REVIEW_RESULT_INVALID",
          event: "job.failed",
          detail: issues,
        },
      );
      return;
    }

    const result: ReviewResult = parsed.data;
    await transitionReviewJob(
      job.id,
      "applying",
      {
        result,
        verdict: result.verdict,
        evidence: result.evidence,
        providerResponseId: outcome.providerResponseId,
      },
      { name: "result.validated", detail: `Verdikt ${result.verdict}` },
    );

    const application = await applyReviewResult({
      submissionId: job.submissionId,
      result,
      settings,
    });

    const onholdReason =
      result.verdict === "onhold"
        ? (result.onhold?.reason ?? null)
        : application.kind === "conflict"
          ? application.reason
          : null;

    await this.finishJob(job, provider, attemptRecord, settings, {
      state: "completed",
      verdict: application.kind === "conflict" ? "onhold" : result.verdict,
      onholdReason,
      errorCode: null,
      event: `result.${application.kind}`,
      detail:
        application.kind === "applied"
          ? `Vorschlag auf ${application.status} gesetzt`
          : application.kind === "conflict"
            ? application.reason
            : application.kind === "none"
              ? application.reason
              : "",
    });
  }

  /**
   * Writes the terminal state of a job.
   *
   * @remarks
   * The report state is decided here rather than later: a synthetic job or a
   * run made whilst reporting is switched off is marked `skipped`, so the
   * report claim never picks it up and there is no queue of reports nobody
   * wants.
   *
   * The settings are handed down from the tick rather than read again, so the
   * whole run is decided by one set of values even when somebody saves a change
   * whilst it is in flight.
   */
  private async finishJob(
    job: ReviewJobRow,
    provider: ReviewProvider,
    attemptRecord: ReviewAttemptRecord | null,
    settings: ReviewSettings,
    terminal: TerminalOutcome,
  ): Promise<void> {
    const attempts = attemptRecord ? [...job.attempts, attemptRecord] : job.attempts;

    await transitionReviewJob(
      job.id,
      terminal.state,
      {
        ...(attemptRecord ? { appendAttempt: attemptRecord } : {}),
        verdict: terminal.verdict,
        onholdReason: terminal.onholdReason,
        errorCode: terminal.errorCode,
        provider: provider.name,
        model: provider.model,
        reasoningEffort: provider.effort,
        usage: sumReviewUsage(attempts.map((entry) => entry.usage)),
        cost: sumReviewCosts(attempts.map((entry) => entry.cost)),
        reportState: job.synthetic || !settings.reportEnabled ? "skipped" : "pending",
        releaseLease: true,
        finished: true,
      },
      { name: terminal.event, detail: terminal.detail },
    );
  }

  /**
   * Sends at most one pending report per tick.
   *
   * @remarks
   * One per tick rather than all of them, so a mail provider having a bad
   * minute cannot turn into a burst of retries. A backlog drains at one report
   * every thirty seconds, which is faster than reports are produced.
   */
  private async processOneReport(settings: ReviewSettings): Promise<void> {
    const job = await claimReviewReport(REPORT_BACKOFF_MS);
    if (!job) return;

    if (!settings.reportEnabled) {
      await skipReviewReport(job.id, "Der Bericht ist in den Einstellungen abgeschaltet");
      return;
    }

    try {
      const sent = await sendReviewReport(job, settings);
      if (sent.ok) {
        await finishReviewReport(job.id, "sent");
        await recordReviewEvent(db, {
          jobId: job.id,
          attempt: job.attempt,
          state: job.state,
          event: "report.sent",
        });
        return;
      }

      await finishReviewReport(job.id, "failed", sent.reason);
      await recordReviewEvent(db, {
        jobId: job.id,
        attempt: job.attempt,
        state: job.state,
        event: "report.failed",
        detail: sent.reason,
        errorId: sent.errorId,
      });
    } catch (error) {
      const errorId = randomUUID();
      logger.error({ err: error, jobId: job.id, errorId }, "review report failed");
      await finishReviewReport(job.id, "failed", "Unerwarteter Fehler beim Versand");
    }
  }

  /**
   * Stops the worker from starting further work.
   */
  stop(): void {
    this.stopped = true;
  }
}

/**
 * Starts the automated review worker.
 *
 * @returns The interval handle, so shutdown can clear it.
 *
 * @remarks
 * The worker starts regardless of configuration. It reads its settings on every
 * tick and does nothing whilst automation is off, which is what lets somebody
 * switch it on in the dashboard without a deployment.
 */
export function startReviewWorker(): NodeJS.Timeout {
  const worker = new ReviewWorker(
    (settings) =>
      new AnthropicReviewProvider({
        model: settings.model,
        effort: settings.effort,
        apiKey: env.ANTHROPIC_API_KEY,
      }),
  );

  const timer = setInterval(() => {
    void worker.tick().catch((error: unknown) => {
      void recordBackgroundError("review-worker", error);
    });
  }, TICK_INTERVAL_MS);

  logger.info({ intervalMs: TICK_INTERVAL_MS, worker: WORKER_ID }, "review worker started");
  return timer;
}
