import { Mistral } from "@mistralai/mistralai";
import { ConnectionError, RequestAbortedError, RequestTimeoutError } from "@mistralai/mistralai/models/errors";

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
import { calculateReviewCost } from "../../lib/review-cost.js";

/** Provider name persisted with every job this adapter runs. */
const MISTRAL_PROVIDER_NAME = "mistral";

/**
 * The API a check is submitted against.
 *
 * @remarks
 * Mistral's hosted web search exists on the conversations API and nowhere else,
 * and a check without search cannot research a shop. Batch processing accepts
 * this endpoint as a target, so the combination is available; it is also the
 * only one that works, which makes it a constraint rather than a choice.
 */
const CONVERSATIONS_ENDPOINT = "/v1/conversations";

/**
 * How often a submitted batch is asked whether it has finished.
 *
 * @remarks
 * The same interval the Anthropic adapter uses, and for the same reason: one
 * cheap request every ten seconds keeps a finished check from sitting around
 * unnoticed.
 */
const BATCH_POLL_INTERVAL_MS = 10_000;

/**
 * How long one attempt waits for its batch.
 *
 * @remarks
 * An attempt gives up well before the provider's own deadline, because waiting
 * longer holds a lease and a worker. The job is then retried and resumes the
 * same batch rather than paying for a second one.
 */
const MAX_BATCH_WAIT_MS = 90 * 60 * 1000;

/**
 * How long the provider may hold the batch before abandoning it.
 *
 * @remarks
 * Set on the job rather than left to the default, so a batch that nobody
 * resumes cannot sit in the queue indefinitely and be billed a day later.
 */
const BATCH_TIMEOUT_HOURS = 24;

/**
 * Output ceiling per request.
 *
 * @remarks
 * The answer has to hold a rejection text of several hundred words alongside
 * the reasoning, and this covers both with room to spare.
 */
const MAX_TOKENS = 64_000;

/**
 * What one finished batch tells us, which is all these two steps read off it.
 *
 * @remarks
 * Narrower than the SDK's job type on purpose. The poll hands the job to the
 * reader rather than the reader fetching it again, and naming the three fields
 * that travel keeps that hand-off from widening into "the whole job object,
 * whatever is on it".
 */
interface FinishedBatchJob {
  status: string;
  outputs?: Array<Record<string, unknown>> | null;
  outputFile?: string | null;
}

/**
 * Statuses that mean the batch will not change again.
 */
const TERMINAL_BATCH_STATUSES = new Set([
  "SUCCESS",
  "FAILED",
  "TIMEOUT_EXCEEDED",
  "CANCELLED",
]);

/**
 * Reads the token counts out of one conversation response.
 *
 * @param usage - The usage object as Mistral reports it.
 * @returns Usage in provider-neutral terms.
 *
 * @remarks
 * Mistral reports a prompt token count and nothing that separates a cached
 * token from a fresh one, so the cache dimensions stay absent and every prompt
 * token is priced at the full input rate. Recording a zero instead would claim
 * that nothing was served from the cache, which is a different statement from
 * not knowing.
 *
 * The search count comes out of the `connectors` map, which counts each hosted
 * tool by name.
 */
function readUsage(usage: unknown): ReviewUsage {
  const read = (name: string): number | undefined => {
    const value = (usage as Record<string, unknown> | null)?.[name];
    return typeof value === "number" ? value : undefined;
  };

  const connectors = (usage as { connectors?: unknown } | null)?.connectors;
  const searches =
    typeof connectors === "object" && connectors !== null
      ? Object.entries(connectors as Record<string, unknown>)
          .filter(([name]) => name.includes("search"))
          .reduce((sum, [, count]) => sum + (typeof count === "number" ? count : 0), 0)
      : 0;

  return {
    inputTokens: read("promptTokens") ?? read("prompt_tokens"),
    outputTokens: read("completionTokens") ?? read("completion_tokens"),
    webSearchCalls: searches,
    toolCalls: 0,
  };
}

/**
 * Joins the assistant's message text out of a conversation's outputs.
 *
 * @param outputs - The entries the conversation produced.
 * @returns The text of every message entry, in order.
 *
 * @remarks
 * A conversation's outputs interleave the model's messages with the tool
 * executions it ran, and only the messages carry the answer. Content is either
 * a plain string or a list of chunks, and both shapes occur.
 */
function readMessageText(outputs: unknown): string {
  if (!Array.isArray(outputs)) return "";

  return outputs
    .flatMap((entry: unknown) => {
      if (typeof entry !== "object" || entry === null) return [];
      const content = (entry as Record<string, unknown>).content;
      if ((entry as Record<string, unknown>).type !== "message.output") return [];

      if (typeof content === "string") return [content];
      if (!Array.isArray(content)) return [];

      return content.flatMap((chunk: unknown) => {
        const text = (chunk as { text?: unknown } | null)?.text;
        return typeof text === "string" ? [text] : [];
      });
    })
    .join("");
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
 * Describes what a conversation returned, for an answer that carried no text.
 *
 * @param outputs - The entries the conversation produced.
 * @returns The entry types in order, or a note that there were none.
 *
 * @remarks
 * An empty answer text is either a conversation that produced only tool
 * executions or an envelope this adapter reads wrongly. The entry types tell
 * the two apart, and nothing else in the record does.
 */
function describeOutputs(outputs: unknown): string {
  if (!Array.isArray(outputs)) return `keine Ausgaben, sondern ${typeof outputs}`;
  if (outputs.length === 0) return "keine Ausgaben";

  const types = outputs.map((entry) =>
    typeof entry === "object" && entry !== null
      ? String((entry as Record<string, unknown>).type ?? "ohne Typ")
      : typeof entry,
  );
  return `kein Text in ${outputs.length} Ausgaben: ${types.join(", ")}`;
}

/**
 * Turns a thrown error into a stable code and a message safe to persist.
 *
 * @param error - Whatever the SDK or the runtime threw.
 * @returns A stable code, a short description, and whether a retry could help.
 *
 * @remarks
 * The codes are the ones the Anthropic adapter produces, because the worker and
 * the audit trail read them and a second vocabulary for the same failures would
 * make a job's history depend on which provider ran it.
 *
 * Only the status reaches the database. Mistral's error body is the response
 * text and can carry request details, so it goes to the log instead.
 */
export function classifyError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof RequestAbortedError || (error as Error)?.name === "AbortError") {
    return { code: "PROVIDER_ABORTED", message: "Lauf wurde abgebrochen", retryable: false };
  }
  if (error instanceof ConnectionError || error instanceof RequestTimeoutError) {
    return {
      code: "PROVIDER_CONNECTION",
      message: "Verbindung zum Provider fehlgeschlagen",
      retryable: true,
    };
  }

  const status = (error as { statusCode?: unknown })?.statusCode;
  if (typeof status !== "number") {
    return {
      code: "PROVIDER_UNKNOWN",
      message: "Unerwarteter Fehler beim Provider",
      retryable: true,
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: "PROVIDER_UNAUTHORIZED",
      message: "Provider-Schlüssel wurde abgelehnt",
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      code: "PROVIDER_MODEL_UNAVAILABLE",
      message: "Angefordertes Modell ist nicht verfügbar",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      code: "PROVIDER_RATE_LIMITED",
      message: "Provider hat das Kontingent begrenzt",
      retryable: true,
    };
  }
  if (status === 400 || status === 422) {
    return {
      code: "PROVIDER_BAD_REQUEST",
      message: "Provider hat die Anfrage abgelehnt",
      retryable: false,
    };
  }

  return {
    code: `PROVIDER_HTTP_${status}`,
    message: `Provider hat mit Status ${status} geantwortet`,
    retryable: status >= 500,
  };
}

/**
 * Runs automated shop reviews against Mistral's conversations API.
 *
 * @remarks
 * Research runs on Mistral's own hosted search, so no request originates from
 * our network and the model cannot reach anything of ours. This adapter
 * executes no tool of its own, and the run is given none, so nothing the model
 * produces decides what we call.
 *
 * Two things differ from the Anthropic adapter and both are the provider's
 * doing. There is no page fetcher, so the rules are built without one and the
 * run works from what the search returns. And there is no ceiling on how often
 * the hosted search may be used, so the number of searches is bounded only by
 * the cost limit the run is given, which is checked once the answer is back.
 */
export class MistralReviewProvider implements ReviewProvider {
  readonly name = MISTRAL_PROVIDER_NAME;
  readonly model: string;
  readonly effort: ReviewEffortLevel | null;

  private readonly client: Mistral | null;

  /**
   * @param options.model - Model to run, from the system settings.
   * @param options.effort - Reasoning effort to request, or `null` where the
   * model takes none.
   * @param options.apiKey - Provider key; defaults to the one in the environment.
   */
  constructor(options: { model: string; effort: ReviewEffortLevel | null; apiKey?: string }) {
    this.model = options.model;
    this.effort = options.effort;
    const apiKey = options.apiKey ?? env.MISTRAL_API_KEY;
    this.client = apiKey ? new Mistral({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async runReview(request: ReviewProviderRequest): Promise<ReviewProviderOutcome> {
    const client = this.client;
    if (!client) {
      return this.outcome("failed", {
        errorCode: "PROVIDER_NOT_CONFIGURED",
        errorMessage: "MISTRAL_API_KEY ist nicht gesetzt",
      });
    }

    let batchId = request.resumeBatchId ?? null;

    try {
      if (!batchId) {
        batchId = await this.submitBatch(client, request);
        request.onBatchCreated?.(batchId);
        request.onProgress?.("Prüfung eingereicht, wartet auf den Anbieter");
      }

      const finished = await this.awaitBatch(client, batchId, request);
      if (finished.kind !== "ended") return finished.outcome;

      const job = finished.job;
      if (job.status !== "SUCCESS") {
        return this.outcome("failed", {
          providerResponseId: batchId,
          errorCode: `PROVIDER_BATCH_${job.status}`,
          errorMessage:
            job.status === "CANCELLED"
              ? "Die eingereichte Prüfung wurde abgebrochen."
              : "Die eingereichte Prüfung wurde nicht rechtzeitig bearbeitet.",
          retryable: job.status === "TIMEOUT_EXCEEDED",
        });
      }

      const answer = await this.readBatchEntry(client, job, request.submissionId);
      if (!answer) {
        return this.outcome("failed", {
          providerResponseId: batchId,
          errorCode: "PROVIDER_BATCH_EMPTY",
          errorMessage: "Der Anbieter hat kein Ergebnis zu dieser Prüfung zurückgegeben.",
          retryable: true,
        });
      }

      return this.readAnswer(answer, request, batchId);
    } catch (error) {
      const classified = classifyError(error);
      logger.error({ err: error, submissionId: request.submissionId }, "review provider failed");
      return this.outcome("failed", {
        providerResponseId: batchId,
        errorCode: classified.code,
        errorMessage: classified.message,
        retryable: classified.retryable,
      });
    }
  }

  /**
   * Submits the check as a batch of one conversation.
   *
   * @param client - The provider client.
   * @param request - The run, for the rules and the shop.
   * @returns The batch identifier.
   *
   * @remarks
   * The request body is passed through to the API as written, so its keys are
   * the ones the wire format uses rather than the ones the SDK's typed clients
   * take.
   */
  private async submitBatch(client: Mistral, request: ReviewProviderRequest): Promise<string> {
    const job = await client.batch.jobs.create({
      endpoint: CONVERSATIONS_ENDPOINT,
      model: this.model,
      timeoutHours: BATCH_TIMEOUT_HOURS,
      requests: [
        {
          customId: `review-${request.submissionId}`,
          body: {
            inputs: buildReviewUserMessage(request),
            instructions: buildReviewSystemPrompt(request.skill, { canFetchPages: false }),
            tools: [{ type: "web_search" }],
            // Not stored, because the conversation holds the shop's pages and
            // the run's reasoning and we have no use for it after the answer.
            store: false,
            completion_args: {
              max_tokens: MAX_TOKENS,
              response_format: { type: "json_object" },
              ...(this.effort ? { reasoning_effort: this.effort } : {}),
            },
          },
        },
      ],
    });

    return job.id;
  }

  /**
   * Reads this check's answer out of a finished batch.
   *
   * @param client - The provider client, for downloading a result file.
   * @param job - The finished batch, as the last poll read it.
   * @param submissionId - Identifies the entry within the batch.
   * @returns The conversation response, or `null` where the batch holds none
   * for this check.
   *
   * @remarks
   * An inline batch may carry its results on the job itself, and a batch of any
   * size may instead leave them in a file to download. Both are read, because
   * which one arrives is the provider's choice rather than ours.
   *
   * The job is passed in rather than fetched again. The poll that ended the
   * wait already returned it, and asking a second time would be a request per
   * check for an answer we hold.
   */
  private async readBatchEntry(
    client: Mistral,
    job: FinishedBatchJob,
    submissionId: number,
  ): Promise<Record<string, unknown> | null> {
    const customId = `review-${submissionId}`;

    const inline = (job.outputs ?? []).find((entry) => readCustomId(entry) === customId);
    if (inline) return readResponseBody(inline);

    if (!job.outputFile) return null;

    const stream = await client.files.download({ fileId: job.outputFile });
    const text = await new Response(stream).text();

    for (const line of text.split("\n")) {
      if (line.trim() === "") continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      if (readCustomId(parsed) === customId) return readResponseBody(parsed);
    }

    return null;
  }

  async repairTexts(texts: TextRepairRequest[]): Promise<TextRepairOutcome> {
    const client = this.client;
    if (!client || texts.length === 0) return { texts: new Map(), usage: {} };

    try {
      const answer = await client.chat.complete({
        model: this.model,
        maxTokens: REPAIR_MAX_TOKENS,
        responseFormat: { type: "json_object" },
        messages: [
          { role: "system", content: REPAIR_SYSTEM_PROMPT },
          { role: "user", content: buildRepairTask(texts) },
        ],
      });

      const content = answer.choices?.[0]?.message?.content;
      const parsed = extractJsonObject(typeof content === "string" ? content : "");
      const repaired = new Map<string, string>();

      if (typeof parsed === "object" && parsed !== null) {
        for (const entry of texts) {
          const value = (parsed as Record<string, unknown>)[entry.path];
          if (typeof value === "string" && value.trim() !== "") repaired.set(entry.path, value);
        }
      }

      return { texts: repaired, usage: readUsage(answer.usage) };
    } catch (error) {
      logger.warn({ err: error }, "review text repair failed");
      return { texts: new Map(), usage: {} };
    }
  }

  /**
   * Waits for a submitted batch to reach a status that will not change again.
   *
   * @param client - The provider client.
   * @param batchId - The batch this check was submitted as.
   * @param request - The run, for its cancellation signal.
   * @returns The job as it ended, or the outcome that ends the attempt.
   *
   * @remarks
   * A cancelled run cancels the batch as well, so a check somebody stopped does
   * not go on being processed and billed.
   */
  private async awaitBatch(
    client: Mistral,
    batchId: string,
    request: ReviewProviderRequest,
  ): Promise<
    { kind: "ended"; job: FinishedBatchJob } | { kind: "other"; outcome: ReviewProviderOutcome }
  > {
    const deadline = Date.now() + MAX_BATCH_WAIT_MS;

    for (;;) {
      if (request.signal?.aborted) {
        await client.batch.jobs.cancel({ jobId: batchId }).catch(() => undefined);
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

      const job = await client.batch.jobs.get({ jobId: batchId });
      if (TERMINAL_BATCH_STATUSES.has(job.status)) return { kind: "ended", job };

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
   * Turns a finished conversation into the outcome of one attempt.
   *
   * @param answer - The conversation response the batch produced.
   * @param request - The run, for its cost ceiling.
   * @param batchId - The batch this came from, kept for correlation.
   * @returns The parsed result, or why it could not be used.
   */
  private readAnswer(
    answer: Record<string, unknown>,
    request: ReviewProviderRequest,
    batchId: string,
  ): ReviewProviderOutcome {
    const usage = readUsage(answer.usage);

    // Priced as a batch, because that is how it was submitted and therefore how
    // it is billed. Pricing it at the standard rate would trip the ceiling at
    // half the spending the operator allowed.
    const spent = BigInt(calculateReviewCost(usage, this.model, undefined, "batch").totalNano);

    if (spent > request.costLimitNano) {
      return this.outcome("budget_exceeded", {
        usage,
        providerResponseId: batchId,
        errorCode: "REVIEW_COST_LIMIT",
        errorMessage: "Der Kostendeckel für diese Prüfung wurde überschritten",
      });
    }

    const text = readMessageText(answer.outputs);
    const parsed = extractJsonObject(text);
    if (!parsed) {
      // A cut-off answer is a different failure from an unusable one, and the
      // difference decides whether trying again can help. Recognised from the
      // token count, because a conversation carries no finish reason; only
      // Mistral's chat completions do.
      const truncated = (usage.outputTokens ?? 0) >= MAX_TOKENS;
      return this.outcome("invalid_output", {
        usage,
        providerResponseId: batchId,
        errorCode: truncated ? "PROVIDER_OUTPUT_TRUNCATED" : "PROVIDER_NO_JSON",
        errorMessage: truncated
          ? `Die Antwort wurde bei ${MAX_TOKENS} Token abgeschnitten und blieb unvollständig.`
          : "Die Antwort enthielt kein auswertbares JSON-Objekt",
        // Kept, because a reply without usable JSON leaves no parsed result
        // behind and the error code alone says nothing about what came back.
        // An empty text is itself the finding, so the outputs are described
        // instead.
        rawAnswer: (text.trim() || describeOutputs(answer.outputs)).slice(0, MAX_RAW_ANSWER_CHARS),
        // A truncated answer is not retried. The next attempt would send the
        // same task against the same ceiling and stop in the same place, and
        // one such attempt cost 0,46 EUR.
        retryable: !truncated,
      });
    }

    return this.outcome("result", { raw: parsed, usage, providerResponseId: batchId });
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

/**
 * Reads the identifier a batch entry was submitted under.
 *
 * @param entry - One entry of a batch result, however it arrived.
 * @returns The identifier, or `null` where the entry names none.
 *
 * @remarks
 * Both spellings are accepted because a downloaded result file is the raw wire
 * format whilst an inline result has passed through the SDK, and the two do not
 * agree on whether keys are converted.
 */
function readCustomId(entry: unknown): string | null {
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as Record<string, unknown>;
  const value = record.custom_id ?? record.customId;
  return typeof value === "string" ? value : null;
}

/**
 * Unwraps the conversation response out of a batch entry.
 *
 * @param entry - One entry of a batch result.
 * @returns The response body, or `null` where the entry carries none.
 *
 * @remarks
 * A batch entry wraps its answer in a response envelope, and an entry that
 * failed carries an error there instead. The envelope is unwrapped where it is
 * present and the entry is read directly where it is not, so a shape without
 * one still yields its outputs rather than nothing.
 */
function readResponseBody(entry: unknown): Record<string, unknown> | null {
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as Record<string, unknown>;

  const response = record.response;
  if (typeof response === "object" && response !== null) {
    const body = (response as Record<string, unknown>).body;
    if (typeof body === "object" && body !== null) return body as Record<string, unknown>;
  }

  const body = record.body;
  if (typeof body === "object" && body !== null) return body as Record<string, unknown>;

  return record.outputs !== undefined ? record : null;
}
