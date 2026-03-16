import Anthropic from "@anthropic-ai/sdk";

/** Fatal error that should stop the entire run (e.g. auth failure, no credits). */
export class LlmFatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmFatalError";
  }
}

export type LlmTask = "extraction" | "narrative";
export type LlmProvider = "claude" | "ollama";

export type LlmGenerateOptions = {
  prompt: string;
  task: LlmTask;
  temperature?: number;
};

type ProviderModelConfig = {
  model: string;
  maxTokens: number;
};

const CLAUDE_EXTRACTION_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_NARRATIVE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_MAX_TOKENS_EXTRACTION = 8192;
const CLAUDE_MAX_TOKENS_NARRATIVE = 2048;

const OLLAMA_EXTRACTION_MODEL = "qwen3.5:397b-cloud";
const OLLAMA_NARRATIVE_MODEL = "qwen3.5:397b-cloud";
const OLLAMA_MAX_TOKENS_EXTRACTION = 8192;
const OLLAMA_MAX_TOKENS_NARRATIVE = 3072;
const OLLAMA_DEFAULT_HOST = "http://127.0.0.1:11434";

let anthropicClient: Anthropic | null = null;
let currentProvider: LlmProvider = "ollama";

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new LlmFatalError("ANTHROPIC_API_KEY environment variable is not set.");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

function modelForTask(task: LlmTask, provider: LlmProvider): ProviderModelConfig {
  if (provider === "ollama") {
    if (task === "narrative") return { model: OLLAMA_NARRATIVE_MODEL, maxTokens: OLLAMA_MAX_TOKENS_NARRATIVE };
    return { model: OLLAMA_EXTRACTION_MODEL, maxTokens: OLLAMA_MAX_TOKENS_EXTRACTION };
  }
  if (task === "narrative") return { model: CLAUDE_NARRATIVE_MODEL, maxTokens: CLAUDE_MAX_TOKENS_NARRATIVE };
  return { model: CLAUDE_EXTRACTION_MODEL, maxTokens: CLAUDE_MAX_TOKENS_EXTRACTION };
}

function parseProvider(raw: string | undefined | null): LlmProvider | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "claude" || normalized === "ollama") return normalized;
  return null;
}

export function setLlmProvider(provider: LlmProvider): void {
  currentProvider = provider;
}

export function getLlmProvider(): LlmProvider {
  return currentProvider;
}

export function resolveInitialLlmProvider(preferred?: string | null): LlmProvider {
  return parseProvider(preferred) ?? parseProvider(process.env.SHOPCHECK_LLM_PROVIDER) ?? "ollama";
}

export function getModelName(task: LlmTask, provider = currentProvider): string {
  return modelForTask(task, provider).model;
}

async function llmGenerateClaude(options: LlmGenerateOptions): Promise<string> {
  const client = getAnthropicClient();
  const { model, maxTokens } = modelForTask(options.task, "claude");

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0,
      messages: [{ role: "user", content: options.prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const fatal = error.status === 401 || error.status === 403 || error.status === 402 ||
        (error.status === 400 && error.message.includes("credit balance"));
      if (fatal) {
        throw new LlmFatalError(`Claude API fatal (${error.status}): ${error.message}`);
      }
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }
    throw error;
  }

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Claude returned non-text response.");
  return block.text;
}

async function llmGenerateOllama(options: LlmGenerateOptions): Promise<string> {
  const { model, maxTokens } = modelForTask(options.task, "ollama");
  const host = process.env.OLLAMA_HOST?.trim() || OLLAMA_DEFAULT_HOST;
  // Use /api/chat so the model's chat template is applied correctly.
  // /api/generate (raw completion) skips the template and causes poor instruction-following.
  const url = new URL("/api/chat", host);

  // Set num_ctx large enough to fit the full prompt + response.
  // Ollama defaults to 2048, which silently truncates large analysis prompts.
  const estimatedInputTokens = Math.ceil(options.prompt.length / 3.5);
  const numCtx = Math.min(131072, Math.max(8192, estimatedInputTokens + maxTokens + 512));

  // For extraction tasks reinforce JSON-only output via system prompt.
  const systemPrompt =
    options.task === "extraction"
      ? "You are a JSON-only assistant. Always respond with a single valid JSON object and nothing else. No prose, no markdown fences, no explanations outside the JSON."
      : undefined;

  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    { role: "user", content: options.prompt },
  ];

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0,
          num_predict: maxTokens,
          num_ctx: numCtx,
        },
      }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new LlmFatalError(`Ollama request failed: ${detail}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const message = `Ollama API error (${response.status}): ${detail || response.statusText}`;
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new LlmFatalError(message);
    }
    throw new Error(message);
  }

  const payload = await response.json() as { message?: { content?: string }; error?: string };
  if (payload.error) throw new Error(`Ollama API error: ${payload.error}`);
  if (typeof payload.message?.content !== "string") throw new Error("Ollama returned no text response.");
  return payload.message.content;
}

export async function llmGenerate(options: LlmGenerateOptions): Promise<string> {
  return currentProvider === "ollama" ? llmGenerateOllama(options) : llmGenerateClaude(options);
}
