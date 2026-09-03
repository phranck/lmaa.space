import { beforeEach, describe, expect, it, vi } from "vitest";

/** Jobs the fake provider answers `get` with, oldest first. */
const jobs: Array<Record<string, unknown>> = [];

vi.mock("@mistralai/mistralai", () => {
  class FakeMistral {
    batch = {
      jobs: {
        create: vi.fn(async () => ({ id: "batch_1" })),
        get: vi.fn(async () => jobs.shift() ?? jobs[jobs.length - 1]),
        cancel: vi.fn(),
      },
    };
    files = { download: vi.fn() };
    chat = { complete: vi.fn() };
  }

  return { Mistral: FakeMistral };
});

const { MistralReviewProvider } = await import("../services/review/mistral-provider.js");

const request = {
  submissionId: 1,
  shopUrl: "https://beispiel.de",
  shopName: "Beispiel",
  skill: { text: "Regeln", version: "abc", path: "/dev/null" },
  context: { criteria: "Kriterien", categoryNames: [] },
  costLimitNano: 10_000_000_000n,
};

function finishedJob(body: Record<string, unknown>) {
  return {
    status: "SUCCESS",
    outputs: [{ custom_id: "review-1", response: { status_code: 200, body } }],
  };
}

function provider() {
  return new MistralReviewProvider({ model: "mistral-large-2512", effort: "high", apiKey: "k" });
}

describe("an answer that could not be used", () => {
  beforeEach(() => {
    jobs.length = 0;
  });

  it("is kept, so the failure is more than a code", async () => {
    // This is the failure the whole thing exists for. A reply without usable
    // JSON leaves no parsed result behind, so without the text there is
    // nothing to look at but PROVIDER_NO_JSON.
    jobs.push(
      finishedJob({
        outputs: [{ type: "message.output", content: "Gerne! Hier ist meine Einschätzung: ..." }],
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
    );

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("invalid_output");
    expect(outcome.errorCode).toBe("PROVIDER_NO_JSON");
    expect(outcome.rawAnswer).toContain("Gerne! Hier ist meine Einschätzung");
  });

  it("is cut to a length a report email can carry", async () => {
    jobs.push(
      finishedJob({
        outputs: [{ type: "message.output", content: "x".repeat(50_000) }],
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
    );

    const outcome = await provider().runReview(request as never);

    expect(outcome.rawAnswer).toHaveLength(4_000);
  });

  it("describes the outputs when the answer carried no text at all", async () => {
    // An empty text is either a run that only executed tools or an envelope
    // this adapter reads wrongly, and the entry types are what tell those
    // apart. Recording an empty string would lose exactly that.
    jobs.push(
      finishedJob({
        outputs: [{ type: "tool.execution", name: "web_search" }, { type: "function.call" }],
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
    );

    const outcome = await provider().runReview(request as never);

    expect(outcome.rawAnswer).toContain("kein Text in 2 Ausgaben");
    expect(outcome.rawAnswer).toContain("tool.execution");
    expect(outcome.rawAnswer).toContain("function.call");
  });

  it("is absent when the answer was usable", async () => {
    jobs.push(
      finishedJob({
        outputs: [{ type: "message.output", content: '{"verdict":"onhold"}' }],
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
    );

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("result");
    expect(outcome.rawAnswer).toBeNull();
  });
});
