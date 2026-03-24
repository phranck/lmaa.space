import {
  DEFAULT_HOST,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIMEOUT_MS,
} from "./constants.js";
import { LlmFatalError } from "./errors.js";
import type { OllamaGenerateOptions, OllamaResponse } from "./types.js";

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Send a chat completion request to an Ollama instance.
 *
 * Features:
 * - Automatic retries for transient errors (429, 5xx)
 * - Configurable timeout via AbortController
 * - Dynamic num_ctx support
 * - Think mode support
 *
 * Throws `LlmFatalError` for non-retryable failures (4xx except 429).
 * Throws generic `Error` after all retries are exhausted.
 */
export async function ollamaGenerate(
  options: OllamaGenerateOptions,
): Promise<string> {
  const host = options.host ?? DEFAULT_HOST;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const url = `${host}/api/chat`;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    stream: false,
    options: {
      temperature,
      num_predict: options.maxTokens,
      ...(options.numCtx != null ? { num_ctx: options.numCtx } : {}),
    },
    ...(options.think ? { think: true } : {}),
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");

        if (!isRetryable(response.status)) {
          throw new LlmFatalError(
            `Ollama returned ${response.status}: ${text}`,
          );
        }

        lastError = new Error(
          `Ollama returned ${response.status}: ${text}`,
        );

        if (attempt < maxRetries) {
          const delay = 1000 * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw lastError;
      }

      const data = (await response.json()) as OllamaResponse;
      return data.message.content;
    } catch (error) {
      if (error instanceof LlmFatalError) throw error;

      const isAbort =
        error instanceof DOMException && error.name === "AbortError";

      lastError = isAbort
        ? new Error(`Ollama request timed out after ${timeoutMs}ms`)
        : (error as Error);

      if (attempt < maxRetries && !isAbort) {
        const delay = 1000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Ollama request failed");
}
