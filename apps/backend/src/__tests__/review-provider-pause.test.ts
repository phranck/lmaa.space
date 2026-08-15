import { beforeEach, describe, expect, it, vi } from "vitest";

const created: Array<Record<string, unknown>> = [];
const answers: Array<Record<string, unknown>> = [];

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    beta = {
      messages: {
        batches: {
          create: vi.fn(async (params: Record<string, unknown>) => {
            created.push(params);
            return { id: `msgbatch_${created.length}` };
          }),
          retrieve: vi.fn(async () => ({ processing_status: "ended" })),
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
