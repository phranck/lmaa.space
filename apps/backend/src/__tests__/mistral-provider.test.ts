import { ConnectionError, RequestAbortedError } from "@mistralai/mistralai/models/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** What the adapter asked the provider for, so the request can be read back. */
const started: Array<{ request: Record<string, unknown>; options?: Record<string, unknown> }> = [];

/** Conversations the fake provider answers with, oldest first. */
const answers: Array<Record<string, unknown>> = [];

vi.mock("@mistralai/mistralai", () => {
  class FakeMistral {
    beta = {
      conversations: {
        start: vi.fn(
          async (request: Record<string, unknown>, options?: Record<string, unknown>) => {
            started.push({ request, options });
            const answer = answers.shift();
            if (!answer) throw new Error("no answer queued");
            return answer;
          },
        ),
      },
    };
    chat = { complete: vi.fn() };
  }

  return { Mistral: FakeMistral };
});

const { MistralReviewProvider, classifyError } = await import(
  "../services/review/mistral-provider.js"
);

const request = {
  submissionId: 1,
  shopUrl: "https://beispiel.de",
  shopName: "Beispiel",
  skill: { text: "Regeln", version: "abc", path: "/dev/null" },
  context: { criteria: "Kriterien", categoryNames: [] },
  costLimitNano: 10_000_000_000n,
};

function conversation(text: string, usage: Record<string, unknown> = {}) {
  return {
    conversationId: "conv_1",
    outputs: [{ type: "message.output", role: "assistant", content: text }],
    usage: { promptTokens: 100, completionTokens: 200, ...usage },
  };
}

function provider(effort: "high" | "max" | null = "high") {
  return new MistralReviewProvider({ model: "mistral-large-2512", effort, apiKey: "k" });
}

describe("the Mistral adapter", () => {
  beforeEach(() => {
    started.length = 0;
    answers.length = 0;
  });

  it("asks once and reads the answer, rather than queueing it", async () => {
    answers.push(conversation('{"verdict":"onhold"}'));

    const outcome = await provider().runReview(request as never);

    expect(started).toHaveLength(1);
    expect(outcome.kind).toBe("result");
    // The conversation identifier is what correlates a run with the provider's
    // own record of it.
    expect(outcome.providerResponseId).toBe("conv_1");
  });

  it("is billed at the standard rate, because nothing was queued", () => {
    expect(provider().billing).toBe("standard");
  });

  it("gives the run a search tool and no page fetcher", async () => {
    answers.push(conversation('{"verdict":"onhold"}'));

    await provider().runReview(request as never);

    const body = started[0].request;
    expect(body.tools).toEqual([{ type: "web_search" }]);
    // Naming a fetcher the run does not have makes it plan around a tool it
    // cannot call.
    expect(JSON.stringify(body.instructions)).not.toContain("web_fetch");
  });

  it("asks for a level Mistral knows, not the one at the top of our scale", async () => {
    // `max` is on the shared scale and not on Mistral's, and a level it does
    // not know is refused with a 400 before anything is researched.
    answers.push(conversation('{"verdict":"onhold"}'));

    await provider("max").runReview(request as never);

    const args = started[0].request.completionArgs as { reasoningEffort?: string };
    expect(args.reasoningEffort).toBe("xhigh");
  });

  it("gives the run a deadline and the run's own cancellation signal", async () => {
    answers.push(conversation('{"verdict":"onhold"}'));
    const controller = new AbortController();

    await provider().runReview({ ...request, signal: controller.signal } as never);

    const options = started[0].options as {
      timeoutMs?: number;
      fetchOptions?: { signal?: AbortSignal };
    };
    expect(options.timeoutMs).toBeGreaterThan(0);
    expect(options.fetchOptions?.signal).toBe(controller.signal);
  });

  it("reads the search count out of the connectors map", async () => {
    answers.push(conversation('{"verdict":"onhold"}', { connectors: { web_search: 4 } }));

    const outcome = await provider().runReview(request as never);

    expect(outcome.usage.inputTokens).toBe(100);
    expect(outcome.usage.outputTokens).toBe(200);
    expect(outcome.usage.webSearchCalls).toBe(4);
  });

  it("leaves the cache dimensions absent, because the provider reports none", async () => {
    answers.push(conversation('{"verdict":"onhold"}'));

    const outcome = await provider().runReview(request as never);

    // Absent rather than zero. A zero would claim that nothing came from the
    // cache, which is a different statement from not knowing.
    expect(outcome.usage.cachedInputTokens).toBeUndefined();
    expect(outcome.usage.cacheWriteTokens).toBeUndefined();
  });

  it("joins the text of a message that arrived in chunks", async () => {
    answers.push({
      conversationId: "conv_1",
      outputs: [
        { type: "tool.execution", name: "web_search" },
        {
          type: "message.output",
          content: [{ type: "text", text: '{"verdict":' }, { type: "text", text: '"onhold"}' }],
        },
      ],
      usage: { promptTokens: 1, completionTokens: 1 },
    });

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("result");
    expect(outcome.raw).toEqual({ verdict: "onhold" });
  });

  it("reports a refused request as a failure rather than as an empty answer", async () => {
    // The fake throws when nothing is queued, which is what a provider-side
    // fault looks like from here.
    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("failed");
    expect(outcome.errorCode).toBe("PROVIDER_UNKNOWN");
  });

  it("refuses to run without a key instead of failing at the provider", async () => {
    const outcome = await new MistralReviewProvider({
      model: "mistral-large-2512",
      effort: null,
      apiKey: undefined,
    }).runReview(request as never);

    expect(outcome.kind).toBe("failed");
    expect(outcome.errorCode).toBe("PROVIDER_NOT_CONFIGURED");
  });
});

describe("classifyError", () => {
  it("uses the same codes the other adapter produces", () => {
    // A job's history must not depend on which provider ran it, so the
    // vocabulary is shared even though the SDKs are not.
    expect(classifyError(new RequestAbortedError("stopped")).code).toBe("PROVIDER_ABORTED");
    expect(classifyError(new ConnectionError("no route")).code).toBe("PROVIDER_CONNECTION");
    expect(classifyError({ statusCode: 401 }).code).toBe("PROVIDER_UNAUTHORIZED");
    expect(classifyError({ statusCode: 404 }).code).toBe("PROVIDER_MODEL_UNAVAILABLE");
    expect(classifyError({ statusCode: 429 }).code).toBe("PROVIDER_RATE_LIMITED");
    expect(classifyError({ statusCode: 400 }).code).toBe("PROVIDER_BAD_REQUEST");
  });

  it("retries a server fault and not a rejected request", () => {
    expect(classifyError({ statusCode: 503 }).retryable).toBe(true);
    expect(classifyError({ statusCode: 400 }).retryable).toBe(false);
    expect(classifyError({ statusCode: 401 }).retryable).toBe(false);
  });

  it("keeps the provider's response body out of what is persisted", () => {
    const message = classifyError({
      statusCode: 400,
      body: '{"request":{"api_key":"sk-secret"}}',
    }).message;

    expect(message).not.toContain("sk-secret");
  });
});
