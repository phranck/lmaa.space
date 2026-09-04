import { beforeEach, describe, expect, it, vi } from "vitest";

/** Batch entries the fake provider answers with, oldest first. */
const answers: Array<Record<string, unknown>> = [];

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    beta = {
      messages: {
        batches: {
          create: vi.fn(async () => ({ id: "batch_1" })),
          retrieve: vi.fn(async () => ({ processing_status: "ended" })),
          cancel: vi.fn(async () => undefined),
          results: vi.fn(async () => {
            const answer = answers.shift();
            if (!answer) throw new Error("no answer queued");
            return {
              async *[Symbol.asyncIterator]() {
                yield { custom_id: "review-1", result: { type: "succeeded", message: answer } };
              },
            };
          }),
        },
      },
    };
    messages = { create: vi.fn() };
  }

  return { default: FakeAnthropic };
});

const { AnthropicReviewProvider } = await import("../services/review/anthropic-provider.js");

const request = {
  submissionId: 1,
  shopUrl: "https://beispiel.de",
  shopName: "Beispiel",
  skill: { text: "Regeln", version: "abc", path: "/dev/null" },
  context: { criteria: "Kriterien", categoryNames: [] },
  costLimitNano: 10_000_000_000n,
};

/**
 * Queues one finished message.
 *
 * @param text - What the answer said, as its single text block.
 * @param stopReason - Why the provider stopped, which is what tells a cut-off
 * answer from an unusable one.
 * @param outputTokens - Output tokens the answer reports, priced against the
 * cost ceiling.
 */
function queueAnswer(text: string, stopReason: string, outputTokens = 20): void {
  answers.push({
    content: text === "" ? [] : [{ type: "text", text }],
    stop_reason: stopReason,
    usage: { input_tokens: 10, output_tokens: outputTokens },
  });
}

function provider() {
  return new AnthropicReviewProvider({ model: "claude-opus-5", effort: "high", apiKey: "k" });
}

describe("an answer that could not be used", () => {
  beforeEach(() => {
    answers.length = 0;
  });

  it("is kept, so the failure is more than a code", async () => {
    // This is the failure the whole thing exists for. A reply without usable
    // JSON leaves no parsed result behind, so without the text there is
    // nothing to look at but PROVIDER_NO_JSON.
    queueAnswer("Gerne! Hier ist meine Einschätzung: ...", "end_turn");

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("invalid_output");
    expect(outcome.errorCode).toBe("PROVIDER_NO_JSON");
    expect(outcome.rawAnswer).toContain("Gerne! Hier ist meine Einschätzung");
  });

  it("is cut to a length a report email can carry", async () => {
    queueAnswer("x".repeat(50_000), "end_turn");

    const outcome = await provider().runReview(request as never);

    expect(outcome.rawAnswer).toHaveLength(4_000);
  });

  it("is an empty string when the answer carried no text block at all", async () => {
    // A reply of tool blocks alone. The empty text is recorded rather than
    // dropped, so the report says the answer held nothing rather than saying
    // nothing about it.
    queueAnswer("", "end_turn");

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("invalid_output");
    expect(outcome.rawAnswer).toBe("");
  });

  it("is absent when the answer was usable", async () => {
    queueAnswer('{"verdict":"onhold"}', "end_turn");

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("result");
    expect(outcome.rawAnswer).toBeNull();
  });
});

describe("an answer that was cut off", () => {
  beforeEach(() => {
    answers.length = 0;
  });

  it("is not reported as unparseable, because it was not", async () => {
    // Correct JSON that stopped before it ended. Recorded as PROVIDER_NO_JSON
    // it sends a reader looking for a malformed answer that was never
    // malformed.
    queueAnswer('{"schemaVersion":"2","verdict":"acc', "max_tokens", 64_000);

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("invalid_output");
    expect(outcome.errorCode).toBe("PROVIDER_OUTPUT_TRUNCATED");
    expect(outcome.errorMessage).toContain("abgeschnitten");
  });

  it("is not retried, because the next attempt hits the same ceiling", async () => {
    // Three identical retries of one truncated answer cost 0,95 EUR on the job
    // this was found in, and none of them could have produced anything else.
    queueAnswer("{", "max_tokens", 64_000);

    const outcome = await provider().runReview(request as never);

    expect(outcome.retryable).toBe(false);
  });

  it("still reports an answer below the ceiling as unparseable", async () => {
    // An answer that stopped on its own and was unusable anyway, so the
    // ceiling is not the only way an answer goes wrong.
    queueAnswer("Gerne! Hier meine Einschätzung.", "end_turn", 9_076);

    const outcome = await provider().runReview(request as never);

    expect(outcome.errorCode).toBe("PROVIDER_NO_JSON");
    expect(outcome.retryable).toBe(true);
  });
});
