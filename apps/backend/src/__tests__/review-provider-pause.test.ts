import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const created: Array<Record<string, unknown>> = [];
const answers: Array<Record<string, unknown>> = [];
/** What polling a batch returns, or the error it throws. */
const poll: { status: string; error: Error | null } = { status: "ended", error: null };

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    beta = {
      messages: {
        batches: {
          create: vi.fn(async (params: Record<string, unknown>) => {
            created.push(params);
            return { id: `msgbatch_${created.length}` };
          }),
          retrieve: vi.fn(async () => {
            if (poll.error) throw poll.error;
            return { processing_status: poll.status };
          }),
          results: vi.fn(async () => {
            const message = answers.shift();
            return {
              async *[Symbol.asyncIterator]() {
                yield { custom_id: "review-1", result: { type: "succeeded", message } };
              },
            };
          }),
          cancel: vi.fn(),
        },
      },
    };
    messages = { create: vi.fn() };
  }

  return {
    default: Object.assign(FakeAnthropic, {
      APIUserAbortError: class extends Error {},
      APIConnectionError: class extends Error {},
      RateLimitError: class extends Error {},
      AuthenticationError: class extends Error {},
      NotFoundError: class extends Error {},
      BadRequestError: class extends Error {},
      APIError: class extends Error {},
    }),
  };
});

const { AnthropicReviewProvider } = await import("../services/review/anthropic-provider.js");

function message(stopReason: string, text?: string) {
  return {
    stop_reason: stopReason,
    content: text
      ? [{ type: "text", text }]
      : [{ type: "thinking", thinking: "…" }, { type: "server_tool_use", name: "web_search" }],
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

const request = {
  submissionId: 1,
  shopUrl: "https://beispiel.de",
  shopName: "Beispiel",
  skill: { text: "Regeln", version: "abc", path: "/dev/null" },
  context: { criteria: "Kriterien", categoryNames: [] },
  costLimitNano: 10_000_000_000n,
};

describe("a paused turn", () => {
  beforeEach(() => {
    created.length = 0;
    answers.length = 0;
  });

  it("is continued in a second batch instead of being read as a missing answer", async () => {
    // The provider's tool loop pauses when it hits its own ceiling, and the
    // paused message carries no text. Read as a final answer it looks like the
    // model forgot to reply, which is how a live check was lost.
    answers.push(message("pause_turn"), message("end_turn", '{"verdict":"onhold"}'));

    const provider = new AnthropicReviewProvider({ model: "claude-opus-5", effort: "high", apiKey: "k" });
    const outcome = await provider.runReview(request as never);

    expect(created).toHaveLength(2);
    expect(outcome.kind).toBe("result");
    // The second request carries the paused turn, so the run continues where it
    // stopped rather than starting over.
    const second = created[1] as { requests: Array<{ params: { messages: unknown[] } }> };
    expect(second.requests[0].params.messages).toHaveLength(2);
  });

  it("adds up what every turn consumed", async () => {
    answers.push(message("pause_turn"), message("end_turn", '{"verdict":"onhold"}'));

    const provider = new AnthropicReviewProvider({ model: "claude-opus-5", effort: "high", apiKey: "k" });
    const outcome = await provider.runReview(request as never);

    expect(outcome.usage.inputTokens).toBe(20);
    expect(outcome.usage.outputTokens).toBe(40);
  });
});

describe("a batch the provider has not finished", () => {
  beforeEach(() => {
    created.length = 0;
    answers.length = 0;
    poll.status = "ended";
    poll.error = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is handed back as pending once the wait window has passed", async () => {
    // On 2026-09-29 batches sat in the provider's queue for twelve hours. A
    // run that gave up on them as failed left them to be answered, billed and
    // never read.
    vi.useFakeTimers();
    poll.status = "in_progress";

    const provider = new AnthropicReviewProvider({ model: "claude-opus-5", effort: "high", apiKey: "k" });
    const run = provider.runReview({ ...request, resumeBatchId: "msgbatch_slow" } as never);
    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    const outcome = await run;

    expect(outcome.kind).toBe("pending");
    expect(outcome.providerResponseId).toBe("msgbatch_slow");
    expect(created).toHaveLength(0);
  });

  it("is handed back as pending when asking about it fails", async () => {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    poll.error = new Anthropic.APIConnectionError({ message: "connection reset" });

    const provider = new AnthropicReviewProvider({ model: "claude-opus-5", effort: "high", apiKey: "k" });
    const outcome = await provider.runReview({ ...request, resumeBatchId: "msgbatch_slow" } as never);

    expect(outcome.kind).toBe("pending");
    expect(outcome.providerResponseId).toBe("msgbatch_slow");
  });
});
