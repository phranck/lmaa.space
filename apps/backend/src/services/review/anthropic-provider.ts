import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages";

import type { ReviewEffortLevel, ReviewUsage } from "@lmaa/shared";

import {
  buildRepairTask,
  buildReviewSystemPrompt,
  buildReviewUserMessage,
  extractJsonObject,
  REPAIR_MAX_TOKENS,
  REPAIR_SYSTEM_PROMPT,
} from "./prompt.js";
import type {
  ReviewProvider,
  ReviewProviderOutcome,
  ReviewProviderRequest,
  TextRepairOutcome,
  TextRepairRequest,
} from "./provider.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { calculateReviewCost, sumReviewUsage } from "../../lib/review-cost.js";

/** Beta flag for the one-hour cache duration. */
const EXTENDED_CACHE_BETA = "extended-cache-ttl-2025-04-11";

/**
 * How often a submitted batch is asked whether it has finished.
 *
 * @remarks
 * Most batches end well inside an hour. Asking every half minute costs one
 * cheap request and keeps a finished check from sitting around unnoticed.
 */
const BATCH_POLL_INTERVAL_MS = 10_000;

/**
 * Turns one check may take.
 *
 * @remarks
 * The provider's tool loop pauses when it reaches its own iteration ceiling,
 * and continuing means another batch and another wait in its queue. Four turns
 * is far more than a decided shop needs and bounds a check that has stopped
 * making progress.
 */
const MAX_BATCH_TURNS = 4;

/**
 * How long one attempt waits for its batch.
 *
 * @remarks
 * The provider gives a batch up to 24 hours. Waiting that long would hold a
 * lease and a worker for a day, so an attempt gives up earlier and the job is
 * retried, which resumes the same batch rather than paying for a second one.
 */
const MAX_BATCH_WAIT_MS = 90 * 60 * 1000;

/** Provider name persisted with every job this adapter runs. */
const ANTHROPIC_PROVIDER_NAME = "anthropic";

/**
 * Output ceiling per request.
 *
 * @remarks
 * The response has to hold the reasoning plus a rejection text of several
 * hundred words, and the ceiling covers both. Requests this large are streamed,
 * because a non-streamed one of this size runs into the SDK's HTTP timeout.
 */
const MAX_TOKENS = 64_000;

/**
 * Largest slice of one fetched page that may enter the conversation.
 *
 * @remarks
 * Everything a run fetches stays in the conversation and is read again on every
 * later turn, so a page fetched early is paid for once per remaining turn. A
 * measured run read 669 000 cached tokens, roughly half of it accumulated page
 * content. Four thousand tokens is several times what an imprint or an "about"
 * page needs, and it bounds a single oversized page from dominating the rest of
 * the run.
 */
const MAX_FETCH_CONTENT_TOKENS = 4000;

/**
 * Most pages one run may fetch.
 *
 * @remarks
 * Lowered from twelve after measuring where a check's money goes: a fetched
 * page is re-read on every later turn, so the budget multiplies rather than
 * adds. Eight pages is more than an imprint, an about page, a terms page and a
 * handful of company records need.
 */
const MAX_FETCHES = 8;

/**
 * Most searches one run may make.
 *
 * @remarks
 * A search costs a cent of its own and brings its results into the conversation
 * as well, so this bounds both.
 */
const MAX_SEARCHES = 8;

/**
 * Reads the token counts out of one provider response.
 *
 * @param message - The completed provider message.
 * @returns Usage in provider-neutral terms.
 *
 * @remarks
 * `input_tokens` is the uncached remainder only, so the cache figures are read
 * separately rather than derived from it. Thinking tokens are already part of
 * `output_tokens` and are recorded for the audit trail rather than priced
 * again.
 */
function readUsage(message: BetaMessage): ReviewUsage {
  const usage = message.usage;
  return {
    inputTokens: usage.input_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.thinking_tokens ?? 0,
    webSearchCalls: usage.server_tool_use?.web_search_requests ?? 0,
    toolCalls: 0,
  };
}

/**
 * How much of an unusable answer is kept.
 *
 * @remarks
 * Enough to see the shape of what came back and to read a stray sentence in
 * front of it, and short enough that a report email stays a report. An answer
 * runs to tens of kilobytes.
 */
const MAX_RAW_ANSWER_CHARS = 4_000;

/**
 * Extracts the JSON object from a completed response.
 *
 * @param message - The completed provider message.
 * @returns The parsed object, or `null` when the text is not a JSON object.
 *
 * @remarks
 * A response can carry several text blocks, so they are joined before being
 * read as one document.
 */
function extractJson(message: BetaMessage): unknown {
  return extractJsonObject(readText(message));
}

/**
 * Joins the text blocks of a completed response.
 *
 * @param message - The completed provider message.
 * @returns Every text block in order, which is the answer as one document.
 *
 * @remarks
 * A response carries the reasoning and the tool use as blocks of their own, so
 * the text blocks are what the answer is.
 */
function readText(message: BetaMessage): string {
  return message.content
    .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Turns a thrown error into a stable code and a message safe to persist.
 *
 * @param error - Whatever the SDK or the runtime threw.
 * @returns A stable code and a short description.
 *
 * @remarks
 * The SDK's error text can carry request details, so only the status and the
 * error type reach the database. The full cause goes to the log, where it is
 * tied to the job through the error id.
 */
function readApiMessage(error: { error?: unknown }): string | null {
  const body = error.error;
  if (typeof body !== "object" || body === null) return null;
  const inner = (body as { error?: unknown }).error;
  if (typeof inner !== "object" || inner === null) return null;
  const message = (inner as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

export function classifyError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  // Checked before the generic API error, because the SDK models a cancelled
  // request as an API error without a status. Left to the branch below, every
  // cancellation we caused ourselves was recorded as the provider having
  // answered with an error, and was retried on top of that.
  // Checked before the generic API error, because the SDK models a cancelled
  // request as an API error without a status. Left to the branch below, every
  // cancellation we caused ourselves was recorded as the provider having
  // answered with an error, and was retried on top of that.
  if (error instanceof Anthropic.APIUserAbortError || (error as Error)?.name === "AbortError") {
    return { code: "PROVIDER_ABORTED", message: "Lauf wurde abgebrochen", retryable: false };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return {
      code: "PROVIDER_CONNECTION",
      message: "Verbindung zum Provider fehlgeschlagen",
      retryable: true,
    };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return {
      code: "PROVIDER_RATE_LIMITED",
      message: "Provider hat das Kontingent begrenzt",
      retryable: true,
    };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      code: "PROVIDER_UNAUTHORIZED",
      message: "Provider-Schlüssel wurde abgelehnt",
      retryable: false,
    };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return {
      code: "PROVIDER_MODEL_UNAVAILABLE",
      message: "Angefordertes Modell ist nicht verfügbar",
      retryable: false,
    };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return {
      code: "PROVIDER_BAD_REQUEST",
      // The provider's own wording is kept for this one status, because a 400
      // names the parameter it refused and nothing else says which. It carries
      // no request data, unlike the SDK's error text.
      message: `Provider hat die Anfrage abgelehnt: ${readApiMessage(error) ?? "ohne Angabe"}`,
      retryable: false,
    };
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? "unbekannt";
    const detail = readApiMessage(error);
    return {
      code: `PROVIDER_HTTP_${error.status ?? "UNKNOWN"}`,
      // The status and the provider's own wording are kept, because without
      // them the reason for a failure lives only in the log and a moderator is
      // told nothing beyond that something went wrong.
      message: `Provider hat mit Status ${status} geantwortet${detail ? `: ${detail}` : ""}`,
      retryable: (error.status ?? 500) >= 500,
    };
  }
  return {
    code: "PROVIDER_UNKNOWN",
    message: "Unerwarteter Fehler beim Provider",
    retryable: true,
  };
}

/**
 * Runs automated shop reviews against the Anthropic Messages API.
 *
 * @remarks
 * Research runs on the provider's own web search and page fetching, so no
 * request originates from our network and the model cannot reach anything of
 * ours. This adapter executes no tool of its own, and the run is given none, so
 * nothing the model produces decides what we call.
 */
export class AnthropicReviewProvider implements ReviewProvider {
  readonly name = ANTHROPIC_PROVIDER_NAME;
  readonly model: string;
  readonly effort: ReviewEffortLevel | null;
  /** Checks are queued as batches here, which the provider bills at half. */
  readonly billing = "batch" as const;

  private readonly client: Anthropic | null;

  /**
   * @param options.model - Model to run, from the system settings.
   * @param options.effort - Reasoning effort to request, from the system settings.
   * @param options.apiKey - Provider key; defaults to the one in the environment.
   *
   * @remarks
   * The model and the effort are constructor arguments rather than read here,
   * because they are settings a person changes in the dashboard and the worker
   * builds a provider per tick from the settings it just read.
   */
  constructor(options: { model: string; effort: ReviewEffortLevel | null; apiKey?: string }) {
    this.model = options.model;
    this.effort = options.effort;
    const apiKey = options.apiKey ?? env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async runReview(request: ReviewProviderRequest): Promise<ReviewProviderOutcome> {
    const client = this.client;
    if (!client) {
      return this.outcome("failed", {
        errorCode: "PROVIDER_NOT_CONFIGURED",
        errorMessage: "ANTHROPIC_API_KEY ist nicht gesetzt",
      });
    }

    const messages: BetaMessageParam[] = [
      { role: "user", content: buildReviewUserMessage(request) },
    ];
    const usages: ReviewUsage[] = [];
    let batchId = request.resumeBatchId ?? null;

    try {
      for (let turn = 0; turn < MAX_BATCH_TURNS; turn += 1) {
        if (!batchId) {
          batchId = await this.submitBatch(client, request, messages);
          // Only the first batch is handed up. A worker that restarts resumes
          // that one and rebuilds the conversation from its answer, which is
          // exactly what this loop does anyway. Handing up a continuation
          // instead would resume a turn whose history the resuming worker does
          // not have.
          if (turn === 0) request.onBatchCreated?.(batchId);
          request.onProgress?.(
            turn === 0
              ? "Prüfung eingereicht, wartet auf den Anbieter"
              : "Recherche wird fortgesetzt",
          );
        }

        const finished = await this.awaitBatch(client, batchId, request);
        if (finished.kind !== "ended") return finished.outcome;

        const entry = await this.readBatchEntry(client, batchId, request.submissionId);
        if (!entry) {
          return this.outcome("failed", {
            usage: sumReviewUsage(usages),
            providerResponseId: batchId,
            errorCode: "PROVIDER_BATCH_EMPTY",
            errorMessage: "Der Anbieter hat kein Ergebnis zu dieser Prüfung zurückgegeben.",
            retryable: true,
          });
        }

        const { result } = entry;

        if (result.type === "errored") {
          return this.outcome("failed", {
            usage: sumReviewUsage(usages),
            providerResponseId: batchId,
            errorCode: "PROVIDER_BATCH_ERROR",
            errorMessage: `Provider hat die Anfrage abgelehnt: ${result.error.error.message}`,
            retryable: false,
          });
        }

        if (result.type !== "succeeded") {
          return this.outcome("failed", {
            usage: sumReviewUsage(usages),
            providerResponseId: batchId,
            errorCode: `PROVIDER_BATCH_${result.type.toUpperCase()}`,
            errorMessage: `Die eingereichte Prüfung wurde ${result.type === "canceled" ? "abgebrochen" : "nicht rechtzeitig bearbeitet"}.`,
            retryable: result.type === "expired",
          });
        }

        const message = result.message;
        usages.push(readUsage(message));

        // The provider's own tool loop has an iteration ceiling. On reaching it
        // the turn pauses, carrying the work so far and no answer. It continues
        // by sending that turn back unchanged, which needs a second batch;
        // adding an instruction here would be read as a new task.
        if (message.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: message.content });
          batchId = null;
          continue;
        }

        return this.readMessage(message, request, batchId, sumReviewUsage(usages));
      }

      return this.outcome("failed", {
        usage: sumReviewUsage(usages),
        providerResponseId: batchId,
        errorCode: "PROVIDER_TURN_LIMIT",
        errorMessage: `Die Recherche kam auch nach ${MAX_BATCH_TURNS} Durchgängen zu keinem Ergebnis.`,
        retryable: false,
      });
    } catch (error) {
      const classified = classifyError(error);
      logger.error({ err: error, submissionId: request.submissionId }, "review provider failed");
      return this.outcome("failed", {
        usage: sumReviewUsage(usages),
        providerResponseId: batchId,
        errorCode: classified.code,
        errorMessage: classified.message,
        retryable: classified.retryable,
      });
    }
  }

  /**
   * Submits one turn of a check as a batch of one request.
   *
   * @param client - The provider client.
   * @param request - The run, for the rules and the shop.
   * @param messages - The conversation so far, which is just the task on the
   * first turn and carries the paused turns after that.
   * @returns The batch identifier.
   */
  private async submitBatch(
    client: Anthropic,
    request: ReviewProviderRequest,
    messages: BetaMessageParam[],
  ): Promise<string> {
    const batch = await client.beta.messages.batches.create({
      betas: [EXTENDED_CACHE_BETA],
      requests: [
        {
          custom_id: `review-${request.submissionId}`,
          params: {
            model: this.model,
            max_tokens: MAX_TOKENS,
            thinking: { type: "adaptive" },
            ...(this.effort ? { output_config: { effort: this.effort } } : {}),
            system: [
              {
                type: "text",
                text: buildReviewSystemPrompt(request.skill),
                // Held for an hour rather than the default five minutes, so a
                // batch that waits in the queue, its continuations and the
                // checks that follow read the rules back instead of writing
                // them again. The write is a fifth of what a check costs.
                cache_control: { type: "ephemeral", ttl: "1h" },
              },
            ],
            tools: [
              { type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES },
              {
                type: "web_fetch_20260209",
                name: "web_fetch",
                max_uses: MAX_FETCHES,
                max_content_tokens: MAX_FETCH_CONTENT_TOKENS,
              },
            ],
            messages,
          },
        },
      ],
    });

    return batch.id;
  }

  /**
   * Reads this check's entry out of a finished batch.
   *
   * @param client - The provider client.
   * @param batchId - The finished batch.
   * @param submissionId - Identifies the entry within the batch.
   * @returns The entry, or `null` where the batch holds none for this check.
   */
  private async readBatchEntry(client: Anthropic, batchId: string, submissionId: number) {
    const results = await client.beta.messages.batches.results(batchId);
    for await (const entry of results) {
      if (entry.custom_id === `review-${submissionId}`) return entry;
    }
    return null;
  }

  async repairTexts(texts: TextRepairRequest[]): Promise<TextRepairOutcome> {
    const client = this.client;
    if (!client || texts.length === 0) return { texts: new Map(), usage: {} };

    const task = buildRepairTask(texts);

    try {
      const message = await client.messages.create({
        model: this.model,
        max_tokens: REPAIR_MAX_TOKENS,
        system: REPAIR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: task }],
      });

      const parsed = extractJson(message as unknown as BetaMessage);
      const repaired = new Map<string, string>();

      if (typeof parsed === "object" && parsed !== null) {
        for (const entry of texts) {
          const value = (parsed as Record<string, unknown>)[entry.path];
          if (typeof value === "string" && value.trim() !== "") repaired.set(entry.path, value);
        }
      }

      return { texts: repaired, usage: readUsage(message as unknown as BetaMessage) };
    } catch (error) {
      logger.warn({ err: error }, "review text repair failed");
      return { texts: new Map(), usage: {} };
    }
  }

  /**
   * Waits for a submitted batch to finish.
   *
   * @param client - The provider client.
   * @param batchId - The batch this check was submitted as.
   * @param request - The run, for its cancellation signal and its progress.
   * @returns That the batch ended, or the outcome that ends the attempt.
   *
   * @remarks
   * A cancelled run cancels the batch as well, so a check somebody stopped does
   * not go on being processed and billed.
   */
  private async awaitBatch(
    client: Anthropic,
    batchId: string,
    request: ReviewProviderRequest,
  ): Promise<{ kind: "ended" } | { kind: "other"; outcome: ReviewProviderOutcome }> {
    const deadline = Date.now() + MAX_BATCH_WAIT_MS;

    for (;;) {
      if (request.signal?.aborted) {
        await client.beta.messages.batches.cancel(batchId).catch(() => undefined);
        return {
          kind: "other",
          outcome: this.outcome("failed", {
            providerResponseId: batchId,
            errorCode: "PROVIDER_ABORTED",
            errorMessage: "Lauf wurde abgebrochen",
            retryable: false,
          }),
        };
      }

      const batch = await client.beta.messages.batches.retrieve(batchId);
      if (batch.processing_status === "ended") return { kind: "ended" };

      if (Date.now() > deadline) {
        return {
          kind: "other",
          outcome: this.outcome("failed", {
            providerResponseId: batchId,
            errorCode: "PROVIDER_BATCH_TIMEOUT",
            errorMessage:
              "Der Anbieter hat die Prüfung nicht innerhalb des Zeitfensters bearbeitet.",
            retryable: true,
          }),
        };
      }

      await new Promise((resolve) => setTimeout(resolve, BATCH_POLL_INTERVAL_MS));
    }
  }

  /**
   * Turns a finished provider message into the outcome of one attempt.
   *
   * @param message - What the provider answered.
   * @param request - The run, for its cost ceiling.
   * @param batchId - The batch this came from, kept for correlation.
   * @returns The parsed result, or why it could not be used.
   */
  private readMessage(
    message: BetaMessage,
    request: ReviewProviderRequest,
    batchId: string,
    usage: ReviewUsage,
  ): ReviewProviderOutcome {
    // Priced as a batch, because that is how it was submitted and therefore how
    // it is billed. Pricing it at the standard rate would trip the ceiling at
    // half the spending the operator allowed.
    const spent = BigInt(calculateReviewCost(usage, this.model, undefined, this.billing).totalNano);

    if (message.stop_reason === "refusal") {
      return this.outcome("refused", {
        usage,
        providerResponseId: batchId,
        stopReason: message.stop_reason,
        errorCode: "PROVIDER_REFUSED",
        errorMessage: "Der Provider hat die Bearbeitung abgelehnt",
      });
    }

    if (spent > request.costLimitNano) {
      return this.outcome("budget_exceeded", {
        usage,
        providerResponseId: batchId,
        stopReason: message.stop_reason,
        errorCode: "REVIEW_COST_LIMIT",
        errorMessage: "Der Kostendeckel für diese Prüfung wurde überschritten",
      });
    }

    const parsed = extractJson(message);
    if (!parsed) {
      // A cut-off answer is a different failure from an unusable one, and the
      // difference decides whether trying again can help. Anthropic says so
      // outright in the stop reason.
      const truncated = message.stop_reason === "max_tokens";
      return this.outcome("invalid_output", {
        usage,
        providerResponseId: batchId,
        stopReason: message.stop_reason,
        errorCode: truncated ? "PROVIDER_OUTPUT_TRUNCATED" : "PROVIDER_NO_JSON",
        errorMessage: truncated
          ? `Die Antwort wurde bei ${MAX_TOKENS} Token abgeschnitten und blieb unvollständig.`
          : "Die Antwort enthielt kein auswertbares JSON-Objekt",
        // Without it a reply that carried no usable JSON leaves nothing to
        // look at but the error code.
        rawAnswer: readText(message).slice(0, MAX_RAW_ANSWER_CHARS),
        // A truncated answer is not retried, because the next attempt sends the
        // same task against the same ceiling and stops in the same place.
        retryable: !truncated,
      });
    }

    return this.outcome("result", {
      raw: parsed,
      usage,
      providerResponseId: batchId,
      stopReason: message.stop_reason,
    });
  }

  private outcome(
    kind: ReviewProviderOutcome["kind"],
    parts: Partial<Omit<ReviewProviderOutcome, "kind">> = {},
  ): ReviewProviderOutcome {
    return {
      kind,
      raw: parts.raw ?? null,
      usage: parts.usage ?? {},
      model: this.model,
      effort: this.effort,
      providerResponseId: parts.providerResponseId ?? null,
      stopReason: parts.stopReason ?? null,
      errorCode: parts.errorCode ?? null,
      errorMessage: parts.errorMessage ?? null,
      rawAnswer: parts.rawAnswer ?? null,
      retryable: parts.retryable ?? false,
    };
  }
}
