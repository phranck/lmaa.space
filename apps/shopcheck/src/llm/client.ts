import { LLM_REQUEST_TIMEOUT_MS } from "../constants";

/** Fatal error that should stop the entire run (e.g. auth failure, model missing). */
export class LlmFatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmFatalError";
  }
}

export type LlmTask = "extraction" | "narrative";
export type LlmProvider = "ollama";

export type LlmGenerateOptions = {
  prompt: string;
  task: LlmTask;
  temperature?: number;
};

type ProviderModelConfig = {
  model: string;
  maxTokens: number;
};

const OLLAMA_EXTRACTION_MODEL = "qwen3.5:397b-cloud";
const OLLAMA_NARRATIVE_MODEL = "qwen3.5:397b-cloud";
const OLLAMA_MAX_TOKENS_EXTRACTION = 8192;
const OLLAMA_MAX_TOKENS_NARRATIVE = 3072;
const OLLAMA_DEFAULT_HOST = "http://127.0.0.1:11434";

let currentProvider: LlmProvider = "ollama";

function modelForTask(task: LlmTask): ProviderModelConfig {
  if (task === "narrative") {
    return { model: OLLAMA_NARRATIVE_MODEL, maxTokens: OLLAMA_MAX_TOKENS_NARRATIVE };
  }
  return { model: OLLAMA_EXTRACTION_MODEL, maxTokens: OLLAMA_MAX_TOKENS_EXTRACTION };
}

export function setLlmProvider(provider: LlmProvider): void {
  currentProvider = provider;
}

export function getLlmProvider(): LlmProvider {
  return currentProvider;
}

export function resolveInitialLlmProvider(): LlmProvider {
  return "ollama";
}

export function getModelName(task: LlmTask): string {
  return modelForTask(task).model;
}

export async function llmGenerate(options: LlmGenerateOptions): Promise<string> {
  const { model, maxTokens } = modelForTask(options.task);
  const host = process.env.OLLAMA_HOST?.trim() || OLLAMA_DEFAULT_HOST;
  const url = new URL("/api/chat", host);

  const estimatedInputTokens = Math.ceil(options.prompt.length / 3.5);
  const numCtx = Math.min(131072, Math.max(8192, estimatedInputTokens + maxTokens + 512));

  const systemPrompt =
    options.task === "extraction"
      ? "You are a JSON-only assistant. Always respond with a single valid JSON object and nothing else. No prose, no markdown fences, no explanations outside the JSON."
      : "You are a precise assistant writing in German. Follow the exact output format specified in the user message. Do not add preamble, commentary, or content outside the requested format.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: options.prompt },
  ];

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          think: false,
          options: {
            temperature: options.temperature ?? 0,
            num_predict: maxTokens,
            num_ctx: numCtx,
          },
        }),
      });
      clearTimeout(timer);
    } catch (error) {
      clearTimeout(timer);
      if (attempt === MAX_RETRIES) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new LlmFatalError(`Ollama request failed after ${MAX_RETRIES + 1} attempts: ${detail}`);
      }
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 5_000 : 15_000));
      continue;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const message = `Ollama API error (${response.status}): ${detail || response.statusText}`;
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        throw new LlmFatalError(message);
      }
      if (attempt === MAX_RETRIES) {
        throw new LlmFatalError(`${message} (after ${MAX_RETRIES + 1} attempts)`);
      }
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 5_000 : 15_000));
      continue;
    }

    const payload = (await response.json()) as { message?: { content?: string }; error?: string };
    if (payload.error) throw new Error(`Ollama API error: ${payload.error}`);
    if (typeof payload.message?.content !== "string") throw new Error("Ollama returned no text response.");
    const raw = payload.message.content;
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (stripped.length < 200) {
      const thinkMatches = [...raw.matchAll(/<think>([\s\S]*?)<\/think>/g)];
      if (thinkMatches.length > 0) {
        const thinkContent = thinkMatches[thinkMatches.length - 1][1].trim();
        if (thinkContent.length > stripped.length) return thinkContent;
      }
    }
    return stripped;
  }

  throw new LlmFatalError("Ollama: unexpected end of retry loop");
}
