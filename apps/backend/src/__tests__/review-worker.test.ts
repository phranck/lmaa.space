import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewJobState } from "@lmaa/shared";

vi.mock("../db/client.js", () => ({ db: {} }));

const repository = vi.hoisted(() => ({
  claimNextReviewJob: vi.fn(),
  claimReviewReport: vi.fn(),
  finalizeExhaustedReviewJobs: vi.fn(),
  finishReviewReport: vi.fn(),
  getSubmissionForReview: vi.fn(),
  heartbeatReviewJob: vi.fn(),
  recordReviewEvent: vi.fn(),
  skipReviewReport: vi.fn(),
  sumReviewCostForDay: vi.fn(),
  transitionReviewJob: vi.fn(),
}));

vi.mock("../repositories/review-jobs.js", () => repository);

const settingsModule = vi.hoisted(() => ({ loadReviewSettings: vi.fn() }));
vi.mock("../services/review/settings.js", () => settingsModule);

const contextModule = vi.hoisted(() => ({
  loadReviewRunContext: vi.fn(),
  MissingAdmissionCriteriaError: class MissingAdmissionCriteriaError extends Error {
    readonly code = "REVIEW_CRITERIA_MISSING";
  },
}));
vi.mock("../services/review/context.js", () => contextModule);

vi.mock("../services/review/skill.js", () => ({
  loadReviewSkill: () => ({ text: "regeln", version: "skill-hash", path: "/tmp/skill.md" }),
}));

const applyModule = vi.hoisted(() => ({ applyReviewResult: vi.fn() }));
vi.mock("../services/review/apply.js", () => applyModule);

const reportModule = vi.hoisted(() => ({ sendReviewReport: vi.fn() }));
vi.mock("../services/review/report.js", () => reportModule);

vi.mock("../services/background-errors.js", () => ({ recordBackgroundError: vi.fn() }));

const { ReviewWorker } = await import("../services/review/worker.js");
const { REVIEW_RESULT_SCHEMA_VERSION } = await import("@lmaa/contracts");
import type { ReviewProvider, ReviewProviderOutcome } from "../services/review/provider.js";

const validResult = {
  schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
  verdict: "onhold",
  criteria: {
    independentOnlinePresence: "pass",
    basedInEurope: "unclear",
    notALargeCompany: "pass",
    notAMarketplace: "pass",
    notDropshipping: "pass",
    notAChain: "pass",
    notAnAffiliatePortal: "pass",
    noFarRightTies: "pass",
  },
  companySize: {
    employees: null,
    revenueEur: null,
    referenceYear: null,
    isEstimate: true,
    sources: [],
    assessment:
      "Keine belastbare Beschäftigtenzahl auffindbar, geschätzt aus einem Standort und der Sortimentsgröße.",
  },
  evidence: [
    { url: "https://beispiel.de", label: "Startseite", retrievedAt: "2026-08-15T10:00:00.000Z" },
  ],
  uncertainties: ["Versandgebiet ist nicht belegt"],
  accept: null,
  reject: null,
  onhold: { reason: "Das Versandgebiet ließ sich nicht belegen.", missing: ["Versandgebiet"] },
};

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    submissionId: 42,
    state: "running" as ReviewJobState,
    attempt: 1,
    maxAttempts: 3,
    synthetic: false,
    attempts: [],
    evidence: [],
    costMissingDimensions: [],
    ...overrides,
  };
}

function outcome(overrides: Partial<ReviewProviderOutcome> = {}): ReviewProviderOutcome {
  return {
    kind: "result",
    raw: validResult,
    usage: { inputTokens: 1000, outputTokens: 200 },
    model: "claude-opus-5",
    effort: "high",
    providerResponseId: "msg_1",
    stopReason: "end_turn",
    errorCode: null,
    errorMessage: null,
    rawAnswer: null,
    retryable: false,
    ...overrides,
  };
}

function fakeProvider(result: ReviewProviderOutcome, configured = true): ReviewProvider {
  return {
    name: "fake",
    model: "claude-opus-5",
    billing: "batch" as const,
    effort: "high",
    isConfigured: () => configured,
    repairTexts: vi.fn(async () => ({ texts: new Map(), usage: {} })),
    runReview: vi.fn().mockResolvedValue(result),
  };
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    autoApply: [],
    model: "claude-opus-5",
    effort: "high",
    maxAttempts: 3,
    costLimitPerCheckNano: 2_000_000_000n,
    costLimitPerDayNano: 10_000_000_000n,
    reportEnabled: true,
    reportTemplateId: 7,
    ...overrides,
  };
}

function transitionsTo(): string[] {
  return repository.transitionReviewJob.mock.calls.map((call) => String(call[1]));
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.finalizeExhaustedReviewJobs.mockResolvedValue([]);
  repository.claimReviewReport.mockResolvedValue(null);
  repository.sumReviewCostForDay.mockResolvedValue(0n);
  repository.heartbeatReviewJob.mockResolvedValue(true);
  repository.transitionReviewJob.mockImplementation((id: number) =>
    Promise.resolve(jobRow({ id })),
  );
  repository.getSubmissionForReview.mockResolvedValue({
    id: 42,
    shopName: "Beispielladen",
    shopUrl: "https://beispiel.de",
    status: "pending",
    readyForReview: false,
  });
  contextModule.loadReviewRunContext.mockResolvedValue({
    criteria: "Kriterien",
    criteriaHash: "hash",
    categoryNames: ["Werkzeug"],
  });
  applyModule.applyReviewResult.mockResolvedValue({ kind: "flagged" });
  settingsModule.loadReviewSettings.mockResolvedValue(settings());
});

describe("review worker", () => {
  it("still finalizes exhausted jobs when the provider has no credential", async () => {
    const worker = new ReviewWorker(() => fakeProvider(outcome(), false));

    await worker.tick();

    expect(repository.finalizeExhaustedReviewJobs).toHaveBeenCalled();
  });

  it("stays idle when the provider has no credential", async () => {
    const worker = new ReviewWorker(() => fakeProvider(outcome(), false));

    await worker.tick();

    expect(repository.claimNextReviewJob).not.toHaveBeenCalled();
  });

  it("takes no new work once the daily ceiling is reached", async () => {
    repository.sumReviewCostForDay.mockResolvedValue(10_000_000_000n);
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    expect(repository.claimNextReviewJob).not.toHaveBeenCalled();
  });

  it("runs a claimed job through to completion", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    expect(transitionsTo()).toEqual(["provider_waiting", "applying", "completed"]);
    expect(applyModule.applyReviewResult).toHaveBeenCalledOnce();
  });

  it("persists the provider profile before a result can be applied", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    const [, , patch] = repository.transitionReviewJob.mock.calls[0];
    expect(patch).toMatchObject({
      provider: "fake",
      model: "claude-opus-5",
      reasoningEffort: "high",
      skillVersion: "skill-hash",
      schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
    });
  });

  it("requeues a retryable provider failure with a later run time", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() =>
      fakeProvider(
        outcome({
          kind: "failed",
          raw: null,
          retryable: true,
          errorCode: "PROVIDER_CONNECTION",
          errorMessage: "Verbindung fehlgeschlagen",
        }),
      ),
    );

    await worker.tick();

    expect(transitionsTo()).toEqual(["provider_waiting", "queued"]);
    const patch = repository.transitionReviewJob.mock.calls[1][2] as { nextRunAt: Date };
    expect(patch.nextRunAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("ends on hold when the last attempt fails", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow({ attempt: 3, maxAttempts: 3 }));
    const worker = new ReviewWorker(() =>
      fakeProvider(
        outcome({ kind: "failed", raw: null, retryable: true, errorCode: "PROVIDER_CONNECTION" }),
      ),
    );

    await worker.tick();

    expect(transitionsTo()).toEqual(["provider_waiting", "failed"]);
    const patch = repository.transitionReviewJob.mock.calls[1][2] as { verdict: string };
    expect(patch.verdict).toBe("onhold");
  });

  it("ends on hold when the provider refuses, without retrying", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() =>
      fakeProvider(
        outcome({ kind: "refused", raw: null, retryable: false, errorCode: "PROVIDER_REFUSED" }),
      ),
    );

    await worker.tick();

    expect(transitionsTo()).toEqual(["provider_waiting", "failed"]);
  });

  it("ends on hold when the per-check ceiling is hit", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() =>
      fakeProvider(
        outcome({
          kind: "budget_exceeded",
          raw: null,
          retryable: false,
          errorCode: "REVIEW_COST_LIMIT",
        }),
      ),
    );

    await worker.tick();

    const patch = repository.transitionReviewJob.mock.calls[1][2] as { errorCode: string };
    expect(patch.errorCode).toBe("REVIEW_COST_LIMIT");
  });

  it("never applies a result that fails the contract", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() =>
      fakeProvider(
        outcome({ raw: { schemaVersion: REVIEW_RESULT_SCHEMA_VERSION, verdict: "accept" } }),
      ),
    );

    await worker.tick();

    expect(applyModule.applyReviewResult).not.toHaveBeenCalled();
    expect(transitionsTo()).toEqual(["provider_waiting", "queued"]);
  });

  it("cancels a job whose submission was already decided", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    repository.getSubmissionForReview.mockResolvedValue({
      id: 42,
      shopName: "Beispielladen",
      shopUrl: "https://beispiel.de",
      status: "approved",
      readyForReview: false,
    });
    const provider = fakeProvider(outcome());
    const worker = new ReviewWorker(() => provider);

    await worker.tick();

    expect(transitionsTo()).toEqual(["cancelled"]);
    expect(provider.runReview).not.toHaveBeenCalled();
  });

  it("resolves a missing criteria page to on hold instead of guessing", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    contextModule.loadReviewRunContext.mockRejectedValue(
      new contextModule.MissingAdmissionCriteriaError(),
    );
    const provider = fakeProvider(outcome());
    const worker = new ReviewWorker(() => provider);

    await worker.tick();

    expect(provider.runReview).not.toHaveBeenCalled();
    const patch = repository.transitionReviewJob.mock.calls[0][2] as { verdict: string };
    expect(patch.verdict).toBe("onhold");
  });

  it("marks a synthetic job's report as skipped", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow({ synthetic: true }));
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    const patch = repository.transitionReviewJob.mock.calls[2][2] as { reportState: string };
    expect(patch.reportState).toBe("skipped");
  });

  it("marks the report as skipped when reporting is switched off", async () => {
    settingsModule.loadReviewSettings.mockResolvedValue(settings({ reportEnabled: false }));
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    const patch = repository.transitionReviewJob.mock.calls[2][2] as { reportState: string };
    expect(patch.reportState).toBe("skipped");
  });

  it("queues the report for a real terminal check", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    const patch = repository.transitionReviewJob.mock.calls[2][2] as { reportState: string };
    expect(patch.reportState).toBe("pending");
  });

  it("leaves a failed report retryable", async () => {
    repository.claimReviewReport.mockResolvedValue(
      jobRow({ state: "completed", reportState: "sending" }),
    );
    reportModule.sendReviewReport.mockResolvedValue({
      ok: false,
      reason: "Der Mailversand wurde nicht bestätigt",
      errorId: null,
    });
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    expect(repository.finishReviewReport).toHaveBeenCalledWith(
      1,
      "failed",
      "Der Mailversand wurde nicht bestätigt",
    );
  });

  it("marks a delivered report as sent", async () => {
    repository.claimReviewReport.mockResolvedValue(
      jobRow({ state: "completed", reportState: "sending" }),
    );
    reportModule.sendReviewReport.mockResolvedValue({ ok: true });
    const worker = new ReviewWorker(() => fakeProvider(outcome()));

    await worker.tick();

    expect(repository.finishReviewReport).toHaveBeenCalledWith(1, "sent");
  });

  it("does not start a second run whilst one is in flight", async () => {
    repository.claimNextReviewJob.mockResolvedValue(jobRow());

    let release: (() => void) | undefined;
    let entered: () => void = () => {};
    const providerEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });

    const provider: ReviewProvider = {
      name: "slow",
      model: "claude-opus-5",
      effort: "high",
      billing: "batch" as const,
      isConfigured: () => true,
      repairTexts: vi.fn(async () => ({ texts: new Map(), usage: {} })),
      runReview: vi.fn(
        () =>
          new Promise<ReviewProviderOutcome>((resolve) => {
            release = () => {
              resolve(outcome());
            };
            entered();
          }),
      ),
    };
    const worker = new ReviewWorker(() => provider);

    const first = worker.tick();
    await providerEntered;

    // The second tick lands whilst the first is still waiting on the provider.
    await worker.tick();
    release?.();
    await first;

    expect(repository.claimNextReviewJob).toHaveBeenCalledOnce();
  });
});
