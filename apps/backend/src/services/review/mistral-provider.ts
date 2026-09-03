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
 * How long one check may take before it is given up on.
 *
 * @remarks
 * A conversation researches a shop with its hosted search, so minutes rather
 * than seconds. The ceiling is what stops a run that has stopped making
 * progress from holding a lease and a worker until the lease expires.
 */
const MAX_RUN_WAIT_MS = 15 * 60 * 1000;

/**
 * Output ceiling per request.
 *
 * @remarks
 * The answer has to hold a rejection text of several hundred words alongside
 * the reasoning, and this covers both with room to spare.
 */
const MAX_TOKENS = 64_000;

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
  /** A conversation is asked and answered, so there is no batch discount. */
  readonly billing = "standard" as const;

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

    request.onProgress?.("Prüfung läuft beim Anbieter");

    // `max` is on our shared scale and not on Mistral's, and a level it does
    // not know is refused with a 400 before anything is researched. The model
    // list normally keeps such a level from being saved, but it cannot when the
    // list could not be fetched.
    const effort = this.effort === "max" ? "xhigh" : this.effort;

    try {
      const answer = await client.beta.conversations.start(
        {
          model: this.model,
          inputs: buildReviewUserMessage(request),
          instructions: buildReviewSystemPrompt(request.skill, { canFetchPages: false }),
          tools: [{ type: "web_search" }],
          // Not stored, because the conversation holds the shop's pages and the
          // run's reasoning and we have no use for it after the answer.
          store: false,
          completionArgs: {
            maxTokens: MAX_TOKENS,
            responseFormat: { type: "json_object" },
            ...(effort ? { reasoningEffort: effort } : {}),
          },
        },
        {
          timeoutMs: MAX_RUN_WAIT_MS,
          // A cancelled run stops the request rather than waiting it out, so a
          // check somebody stopped is not still being billed for.
          fetchOptions: { signal: request.signal },
        },
      );

      return this.readAnswer(
        answer as unknown as Record<string, unknown>,
        request,
        answer.conversationId,
      );
    } catch (error) {
      const classified = classifyError(error);
      logger.error({ err: error, submissionId: request.submissionId }, "review provider failed");
      return this.outcome("failed", {
        errorCode: classified.code,
        errorMessage: classified.message,
        retryable: classified.retryable,
      });
    }
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
   * Turns a finished conversation into the outcome of one attempt.
   *
   * @param answer - What the conversation returned.
   * @param request - The run, for its cost ceiling.
   * @param conversationId - The conversation it came from, kept for correlation.
   * @returns The parsed result, or why it could not be used.
   */
  private readAnswer(
    answer: Record<string, unknown>,
    request: ReviewProviderRequest,
    conversationId: string,
  ): ReviewProviderOutcome {
    const usage = readUsage(answer.usage);

    // Priced at the rate this adapter is billed at, which is the standard one:
    // a conversation is asked and answered rather than queued.
    const spent = BigInt(calculateReviewCost(usage, this.model, undefined, this.billing).totalNano);

    if (spent > request.costLimitNano) {
      return this.outcome("budget_exceeded", {
        usage,
        providerResponseId: conversationId,
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
        providerResponseId: conversationId,
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

    return this.outcome("result", { raw: parsed, usage, providerResponseId: conversationId });
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
