import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages";

import type { ReviewEffortLevel, ReviewUsage } from "@lmaa/shared";

import { buildReviewSystemPrompt, buildReviewUserMessage } from "./prompt.js";
import type { ReviewProvider, ReviewProviderOutcome, ReviewProviderRequest } from "./provider.js";
import { env } from "../../config/env.js";
import { geocodeAddress } from "../../lib/geocoding.js";
import { logger } from "../../lib/logger.js";
import { calculateReviewCost, sumReviewUsage } from "../../lib/review-cost.js";

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
 * Most rounds of tool use one attempt may take.
 *
 * @remarks
 * A shop check reads a handful of pages and geocodes one address, so a run that
 * passes this has stopped making progress. The cost ceiling would catch it too,
 * but later and more expensively.
 */
const MAX_TURNS = 30;

/**
 * Largest slice of one fetched page that may enter the conversation.
 *
 * @remarks
 * Everything a run fetches stays in the conversation and is read again on every
 * later turn, so a page fetched early is paid for once per remaining turn. A
 * measured run read 669 000 cached tokens, roughly half of it accumulated page
 * content. Six thousand tokens is several times what an imprint or an "about"
 * page needs, and it bounds a single oversized page from dominating the rest of
 * the run.
 */
const MAX_FETCH_CONTENT_TOKENS = 6000;

/**
 * Most pages one run may fetch.
 */
const MAX_FETCHES = 12;

/**
 * Most searches one run may make.
 *
 * @remarks
 * A search costs a cent of its own and brings its results into the conversation
 * as well, so this bounds both.
 */
const MAX_SEARCHES = 8;

const GEOCODE_TOOL_NAME = "geocode";

interface GeocodeToolInput {
  street?: unknown;
  postalCode?: unknown;
  city?: unknown;
  countryCode?: unknown;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

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
 * Extracts the JSON object from a completed response.
 *
 * @param message - The completed provider message.
 * @returns The parsed object, or `null` when the text is not a JSON object.
 *
 * @remarks
 * Structured outputs make the final text a JSON document, so the plain parse is
 * the expected path. The brace-scanning fallback covers a response that carried
 * a stray sentence alongside it, which is cheaper to tolerate here than to pay
 * for a second full run over.
 */
function extractJson(message: BetaMessage): unknown {
  const text = message.content
    .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as unknown;
    } catch {
      return null;
    }
  }
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
/**
 * Turns a finished content block into a line about what the run does next.
 *
 * @param onProgress - Where the line goes.
 * @returns A listener for the stream's completed blocks.
 *
 * @remarks
 * A block completes as its input finishes streaming, so a tool block is
 * reported just before the tool runs, which is exactly the step somebody
 * waiting wants to see. Blocks that say nothing about progress produce no line
 * rather than a vague one.
 */
export function reportProgress(onProgress: (step: string) => void) {
  return (block: BetaContentBlock): void => {
    if (block.type === "thinking") {
      onProgress("Denkt nach");
      return;
    }

    if (block.type !== "server_tool_use" && block.type !== "tool_use") return;

    const input = (block.input ?? {}) as Record<string, unknown>;

    if (block.name === "web_search") {
      const query = typeof input.query === "string" ? input.query : null;
      onProgress(query ? `Sucht nach „${query}"` : "Sucht");
      return;
    }

    if (block.name === "web_fetch") {
      const url = typeof input.url === "string" ? input.url : null;
      let host: string | null = null;
      if (url) {
        try {
          host = new URL(url).hostname;
        } catch {
          host = null;
        }
      }
      onProgress(host ? `Liest ${host}` : "Liest eine Seite");
      return;
    }

    if (block.name === GEOCODE_TOOL_NAME) {
      onProgress("Prüft die Adresse");
      return;
    }

    onProgress(`Führt ${block.name} aus`);
  };
}

function readApiMessage(error: { error?: unknown }): string | null {
  const body = error.error;
  if (typeof body !== "object" || body === null) return null;
  const inner = (body as { error?: unknown }).error;
  if (typeof inner !== "object" || inner === null) return null;
  const message = (inner as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function classifyError(error: unknown): { code: string; message: string; retryable: boolean } {
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
    return {
      code: `PROVIDER_HTTP_${error.status ?? "UNKNOWN"}`,
      message: "Provider hat mit einem Fehler geantwortet",
      retryable: (error.status ?? 500) >= 500,
    };
  }
  if (error instanceof Error && error.name === "AbortError") {
    return { code: "PROVIDER_ABORTED", message: "Lauf wurde abgebrochen", retryable: true };
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
 * ours. The single tool this adapter executes takes address fields and builds
 * the geocoding request itself, which leaves the destination out of the model's
 * hands.
 */
export class AnthropicReviewProvider implements ReviewProvider {
  readonly name = ANTHROPIC_PROVIDER_NAME;
  readonly model: string;
  readonly effort: ReviewEffortLevel | null;

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
    let providerResponseId: string | null = null;
    // The search and fetch tools filter their results through code execution,
    // which runs in a container. A follow-up request that carries pending tool
    // uses from such a turn is refused unless it names that container, so the
    // identifier is carried forward once the provider has opened one.
    let containerId: string | null = null;
    let executedToolCalls = 0;

    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      let message: BetaMessage;
      // The usage of the turn in flight, kept as the stream reports it. A run
      // that is cancelled mid-turn is billed for what it had already produced,
      // so the last snapshot is what makes that spend bookable.
      let pendingUsage: ReviewUsage | null = null;
      try {
        const stream = client.beta.messages.stream(
          {
            model: this.model,
            max_tokens: MAX_TOKENS,
            ...(containerId ? { container: containerId } : {}),
            thinking: { type: "adaptive" },
            // The result shape is given in the system prompt rather than through
            // `output_config.format`. The provider compiles a response schema
            // into a grammar together with the tool schemas, and the three
            // tools this run needs already exhaust that budget: a request
            // carrying both is refused before generation with "the compiled
            // grammar is too large". The contract in `@lmaa/contracts` decides
            // whether an answer may be applied either way, so nothing about
            // validation changes.
            // Sent only where the model takes it. A model that reports no
            // effort refuses the whole request over the parameter alone.
            ...(this.effort ? { output_config: { effort: this.effort } } : {}),
            system: [
              {
                type: "text",
                text: buildReviewSystemPrompt(request.skill),
                // The rules are identical on every run, so they are read back
                // from the cache at a tenth of the input rate instead of being
                // paid for in full each time.
                cache_control: { type: "ephemeral" },
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
              {
                name: GEOCODE_TOOL_NAME,
                description:
                  "Löst eine Adresse in Koordinaten auf. Führt die Kaskade aus den Aufnahmeregeln selbst aus: vollständige Adresse, dann ohne Straße, dann Postleitzahl und Ort. Gibt Breitengrad, Längengrad, die gefundene Adresse und die Genauigkeit zurück.",
                input_schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    street: { type: "string", description: "Straße mit Hausnummer" },
                    postalCode: { type: "string", description: "Postleitzahl" },
                    city: { type: "string", description: "Ort" },
                    countryCode: {
                      type: "string",
                      description: "Ländercode nach ISO 3166-1 alpha-2, etwa DE",
                    },
                  },
                  required: ["city"],
                },
              },
            ],
            messages,
          },
          { signal: request.signal },
        );
        if (request.onProgress) stream.on("contentBlock", reportProgress(request.onProgress));
        stream.on("streamEvent", (_event, snapshot) => {
          pendingUsage = readUsage(snapshot);
        });
        message = await stream.finalMessage();
      } catch (error) {
        const classified = classifyError(error);
        logger.error({ err: error, submissionId: request.submissionId }, "review provider failed");
        return this.outcome("failed", {
          usage: sumReviewUsage(pendingUsage ? [...usages, pendingUsage] : usages),
          providerResponseId,
          errorCode: classified.code,
          errorMessage: classified.message,
          retryable: classified.retryable,
        });
      }

      providerResponseId = message.id;
      containerId = message.container?.id ?? containerId;
      usages.push(readUsage(message));

      const spent = BigInt(calculateReviewCost(sumReviewUsage(usages), this.model).totalNano);
      if (spent > request.costLimitNano) {
        return this.outcome("budget_exceeded", {
          usage: sumReviewUsage(usages),
          providerResponseId,
          stopReason: message.stop_reason,
          errorCode: "REVIEW_COST_LIMIT",
          errorMessage: "Der Kostendeckel für diese Prüfung wurde erreicht",
        });
      }

      if (message.stop_reason === "refusal") {
        return this.outcome("refused", {
          usage: sumReviewUsage(usages),
          providerResponseId,
          stopReason: message.stop_reason,
          errorCode: "PROVIDER_REFUSED",
          errorMessage: "Der Provider hat die Bearbeitung abgelehnt",
        });
      }

      // A server-side tool loop that hits its own iteration ceiling pauses. The
      // conversation continues by sending it back unchanged; adding a nudge
      // would be read as a new instruction.
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }

      if (message.stop_reason === "tool_use") {
        const toolUses = message.content.filter(
          (block): block is Extract<typeof block, { type: "tool_use" }> =>
            block.type === "tool_use",
        );
        if (toolUses.length === 0) {
          return this.outcome("invalid_output", {
            usage: sumReviewUsage(usages),
            providerResponseId,
            stopReason: message.stop_reason,
            errorCode: "PROVIDER_EMPTY_TOOL_USE",
            errorMessage: "Der Provider meldete Werkzeugnutzung ohne Aufruf",
            retryable: true,
          });
        }

        messages.push({ role: "assistant", content: message.content });
        const results = await Promise.all(toolUses.map((call) => this.runTool(call)));
        executedToolCalls += results.length;
        messages.push({ role: "user", content: results });
        continue;
      }

      const raw = extractJson(message);
      if (raw === null) {
        return this.outcome("invalid_output", {
          usage: sumReviewUsage(usages),
          providerResponseId,
          stopReason: message.stop_reason,
          errorCode:
            message.stop_reason === "max_tokens" ? "PROVIDER_TRUNCATED" : "PROVIDER_NOT_JSON",
          errorMessage:
            message.stop_reason === "max_tokens"
              ? "Die Antwort wurde abgeschnitten, bevor das Ergebnis vollständig war"
              : "Die Antwort enthielt kein auswertbares JSON",
          retryable: true,
        });
      }

      const usage = sumReviewUsage(usages);
      usage.toolCalls = executedToolCalls;
      return this.outcome("result", {
        raw,
        usage,
        providerResponseId,
        stopReason: message.stop_reason,
      });
    }

    return this.outcome("failed", {
      usage: sumReviewUsage(usages),
      providerResponseId,
      errorCode: "PROVIDER_TURN_LIMIT",
      errorMessage: "Der Lauf hat die zulässige Anzahl an Werkzeugrunden überschritten",
    });
  }

  /**
   * Executes one tool call on the model's behalf.
   *
   * @param call - The tool-use block the provider produced.
   * @returns A tool result block to send back.
   *
   * @remarks
   * An unknown tool name and a failed geocoding both come back as an error
   * result rather than throwing. The model can then say so in its result, which
   * is more useful than losing the whole run over one address.
   */
  private async runTool(call: {
    id: string;
    name: string;
    input: unknown;
  }): Promise<BetaContentBlockParam> {
    if (call.name !== GEOCODE_TOOL_NAME) {
      return {
        type: "tool_result",
        tool_use_id: call.id,
        is_error: true,
        content: `Unbekanntes Werkzeug: ${call.name}`,
      };
    }

    const input = (call.input ?? {}) as GeocodeToolInput;
    try {
      const result = await geocodeAddress({
        street: asOptionalString(input.street),
        postalCode: asOptionalString(input.postalCode),
        city: asOptionalString(input.city),
        countryCode: asOptionalString(input.countryCode),
      });

      if (!result) {
        return {
          type: "tool_result",
          tool_use_id: call.id,
          content:
            "Für diese Adresse konnten auch über die gesamte Kaskade keine Koordinaten ermittelt werden.",
        };
      }

      return {
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify({
          latitude: result.latitude,
          longitude: result.longitude,
          matchedAddress: result.displayName,
          source: result.source,
        }),
      };
    } catch (error) {
      logger.warn({ err: error }, "review geocode tool failed");
      return {
        type: "tool_result",
        tool_use_id: call.id,
        is_error: true,
        content: "Die Geokodierung ist fehlgeschlagen.",
      };
    }
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
      retryable: parts.retryable ?? false,
    };
  }
}
