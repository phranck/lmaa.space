import { ConnectionError, RequestAbortedError } from "@mistralai/mistralai/models/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";


/** Batch jobs the adapter created, so a resumed run can be told from a fresh one. */
const created: Array<Record<string, unknown>> = [];

/** Jobs the fake provider answers `get` with, oldest first. */
const jobs: Array<Record<string, unknown>> = [];

const cancelled: string[] = [];

vi.mock("@mistralai/mistralai", () => {
  class FakeMistral {
    batch = {
      jobs: {
        create: vi.fn(async (params: Record<string, unknown>) => {
          created.push(params);
          return { id: `batch_${created.length}` };
        }),
        get: vi.fn(async () => jobs.shift() ?? jobs[jobs.length - 1]),
        cancel: vi.fn(async ({ jobId }: { jobId: string }) => {
          cancelled.push(jobId);
        }),
      },
    };
    files = { download: vi.fn() };
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

/** A finished batch carrying one answer inline, as an inline batch returns it. */
function finishedJob(body: Record<string, unknown>) {
  return {
    status: "SUCCESS",
    outputs: [{ custom_id: "review-1", response: { status_code: 200, body } }],
  };
}

function conversation(text: string, usage: Record<string, unknown> = {}) {
  return {
    outputs: [{ type: "message.output", role: "assistant", content: text }],
    usage: { promptTokens: 100, completionTokens: 200, ...usage },
  };
}

function provider() {
  return new MistralReviewProvider({ model: "mistral-large-2512", effort: "high", apiKey: "k" });
}

describe("the Mistral adapter", () => {
  beforeEach(() => {
    created.length = 0;
    jobs.length = 0;
    cancelled.length = 0;
  });

  it("submits the check against the conversations endpoint", async () => {
    jobs.push(finishedJob(conversation('{"verdict":"onhold"}')));

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("result");
    expect(created).toHaveLength(1);
    // The hosted search lives on this endpoint and nowhere else, so a check
    // submitted anywhere else can research nothing.
    expect(created[0].endpoint).toBe("/v1/conversations");
  });

  it("gives the run a search tool and no page fetcher", async () => {
    jobs.push(finishedJob(conversation('{"verdict":"onhold"}')));

    await provider().runReview(request as never);

    const body = (created[0] as { requests: Array<{ body: Record<string, unknown> }> }).requests[0]
      .body;
    expect(body.tools).toEqual([{ type: "web_search" }]);
    // Naming a fetcher the run does not have makes it plan around a tool it
    // cannot call.
    expect(JSON.stringify(body.instructions)).not.toContain("web_fetch");
  });

  it("resumes a batch a previous attempt submitted instead of paying twice", async () => {
    jobs.push(finishedJob(conversation('{"verdict":"onhold"}')));

    const outcome = await provider().runReview({
      ...request,
      resumeBatchId: "batch_from_before",
    } as never);

    expect(created).toHaveLength(0);
    expect(outcome.providerResponseId).toBe("batch_from_before");
  });

  it("reads the search count out of the connectors map", async () => {
    jobs.push(finishedJob(conversation('{"verdict":"onhold"}', { connectors: { web_search: 4 } })));

    const outcome = await provider().runReview(request as never);

    expect(outcome.usage.inputTokens).toBe(100);
    expect(outcome.usage.outputTokens).toBe(200);
    expect(outcome.usage.webSearchCalls).toBe(4);
  });

  it("leaves the cache dimensions absent, because the provider reports none", async () => {
    jobs.push(finishedJob(conversation('{"verdict":"onhold"}')));

    const outcome = await provider().runReview(request as never);

    // Absent rather than zero. A zero would claim that nothing came from the
    // cache, which is a different statement from not knowing.
    expect(outcome.usage.cachedInputTokens).toBeUndefined();
    expect(outcome.usage.cacheWriteTokens).toBeUndefined();
  });

  it("joins the text of a message that arrived in chunks", async () => {
    jobs.push(
      finishedJob({
        outputs: [
          { type: "tool.execution", name: "web_search" },
          {
            type: "message.output",
            content: [{ type: "text", text: '{"verdict":' }, { type: "text", text: '"onhold"}' }],
          },
        ],
        usage: { promptTokens: 1, completionTokens: 1 },
      }),
    );

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("result");
    expect(outcome.raw).toEqual({ verdict: "onhold" });
  });

  it("reports a failed batch as a failure rather than as an empty answer", async () => {
    jobs.push({ status: "FAILED", outputs: [] });

    const outcome = await provider().runReview(request as never);

    expect(outcome.kind).toBe("failed");
    expect(outcome.errorCode).toBe("PROVIDER_BATCH_FAILED");
    expect(outcome.retryable).toBe(false);
  });

  it("stops the batch at the provider when the run is cancelled", async () => {
    jobs.push({ status: "QUEUED", outputs: [] });

    const outcome = await provider().runReview({
      ...request,
      signal: AbortSignal.abort(),
    } as never);

    expect(outcome.errorCode).toBe("PROVIDER_ABORTED");
    // A check somebody stopped must not go on being processed and billed.
    expect(cancelled).toEqual(["batch_1"]);
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
