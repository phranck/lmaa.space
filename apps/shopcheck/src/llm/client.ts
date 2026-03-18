import Anthropic from "@anthropic-ai/sdk";
import { LLM_REQUEST_TIMEOUT_MS } from "../constants";

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

  const systemPrompt =
    options.task === "extraction"
      ? "You are a JSON-only assistant. Always respond with a single valid JSON object and nothing else. No prose, no markdown fences, no explanations outside the JSON."
      : "You are a precise assistant writing in German. Follow the exact output format specified in the user message. Do not add preamble, commentary, or content outside the requested format.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: options.prompt },
  ];

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
      if (error instanceof LlmFatalError) throw error;
      if (attempt === MAX_RETRIES) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new LlmFatalError(`Ollama request failed after ${MAX_RETRIES + 1} attempts: ${detail}`);
      }
      console.warn(`[shopcheck] Ollama attempt ${attempt + 1} failed, retrying...`);
      await new Promise(r => setTimeout(r, attempt === 0 ? 5_000 : 15_000));
      continue;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const message = `Ollama API error (${response.status}): ${detail || response.statusText}`;
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        throw new LlmFatalError(message);
      }
      if (attempt === MAX_RETRIES) throw new LlmFatalError(`${message} (after ${MAX_RETRIES + 1} attempts)`);
      console.warn(`[shopcheck] Ollama attempt ${attempt + 1} HTTP error, retrying...`);
      await new Promise(r => setTimeout(r, attempt === 0 ? 5_000 : 15_000));
      continue;
    }

    const payload = await response.json() as { message?: { content?: string }; error?: string };
    if (payload.error) throw new Error(`Ollama API error: ${payload.error}`);
    if (typeof payload.message?.content !== "string") throw new Error("Ollama returned no text response.");
    const raw = payload.message.content;
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    // Some cloud models (e.g. qwen3.5:397b-cloud) ignore think:false and put the actual
    // response inside <think> blocks, leaving only a short prefix outside. If the stripped
    // result is suspiciously short but there are think blocks, fall back to the last
    // think-block's content (which contains the real answer).
    if (stripped.length < 200) {
      const thinkMatches = [...raw.matchAll(/<think>([\s\S]*?)<\/think>/g)];
      if (thinkMatches.length > 0) {
        const thinkContent = thinkMatches[thinkMatches.length - 1][1].trim();
        if (thinkContent.length > stripped.length) return thinkContent;
      }
    }
    return stripped;
  }

  // TypeScript requires a return here; the loop above always returns or throws.
  throw new LlmFatalError("Ollama: unexpected end of retry loop");
}

export async function llmGenerate(options: LlmGenerateOptions): Promise<string> {
  return currentProvider === "ollama" ? llmGenerateOllama(options) : llmGenerateClaude(options);
}

// ---- Agent chat (multi-turn with tool calling) ----

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[] }
  | { role: "tool"; toolCallId: string; toolName: string; content: string };

export type LlmChatOptions = {
  system: string;
  messages: AgentMessage[];
  tools: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
};

export type LlmChatResponse = {
  text: string;
  toolCalls: ToolCall[];
};

async function llmChatClaude(options: LlmChatOptions): Promise<LlmChatResponse> {
  const client = getAnthropicClient();
  const { model } = modelForTask("narrative", "claude");
  const maxTokens = options.maxTokens ?? 8192;

  // Convert AgentMessage[] → Anthropic MessageParam[]
  // Rules: alternating user/assistant; tool results fold into a user message after assistant
  type AntMsg = Anthropic.MessageParam;
  const messages: AntMsg[] = [];
  let i = 0;
  while (i < options.messages.length) {
    const msg = options.messages[i];
    if (msg.role === "user") {
      messages.push({ role: "user", content: msg.content });
      i++;
    } else if (msg.role === "assistant") {
      const content: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];
      if (msg.text) content.push({ type: "text", text: msg.text });
      for (const tc of msg.toolCalls) {
        content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments as object });
      }
      messages.push({ role: "assistant", content: content.length > 0 ? content : msg.text });
      i++;
      // Collect following tool results into one user message
      const results: Anthropic.ToolResultBlockParam[] = [];
      while (i < options.messages.length && options.messages[i].role === "tool") {
        const tr = options.messages[i] as Extract<AgentMessage, { role: "tool" }>;
        results.push({ type: "tool_result", tool_use_id: tr.toolCallId, content: tr.content });
        i++;
      }
      if (results.length > 0) messages.push({ role: "user", content: results });
    } else {
      i++;
    }
  }

  const tools: Anthropic.Tool[] = options.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool["input_schema"],
  }));

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      system: options.system,
      messages,
      tools,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const fatal = error.status === 401 || error.status === 403 || error.status === 402 ||
        (error.status === 400 && error.message.includes("credit balance"));
      if (fatal) throw new LlmFatalError(`Claude chat fatal (${error.status}): ${error.message}`);
      throw new Error(`Claude chat error (${error.status}): ${error.message}`);
    }
    throw error;
  }

  let text = "";
  const toolCalls: ToolCall[] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({ id: block.id, name: block.name, arguments: block.input as Record<string, unknown> });
    }
  }
  return { text, toolCalls };
}

async function llmChatOllama(options: LlmChatOptions): Promise<LlmChatResponse> {
  const { model } = modelForTask("narrative", "ollama");
  const maxTokens = options.maxTokens ?? 8192;
  const host = process.env.OLLAMA_HOST?.trim() || OLLAMA_DEFAULT_HOST;
  const url = new URL("/api/chat", host);

  // Estimate total chars for num_ctx
  const totalChars = options.system.length + options.messages.reduce((sum, m) => {
    if (m.role === "user") return sum + m.content.length;
    if (m.role === "assistant") return sum + m.text.length;
    if (m.role === "tool") return sum + m.content.length;
    return sum;
  }, 0);
  const numCtx = Math.min(131072, Math.max(65536, Math.ceil(totalChars / 3.5) + maxTokens + 1024));

  type OllamaMsg = { role: string; content: string; tool_calls?: unknown[] };
  const messages: OllamaMsg[] = [{ role: "system", content: options.system }];
  for (const msg of options.messages) {
    if (msg.role === "user") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      if (msg.toolCalls.length > 0) {
        messages.push({
          role: "assistant",
          content: msg.text || "",
          tool_calls: msg.toolCalls.map((tc) => ({ function: { name: tc.name, arguments: tc.arguments } })),
        });
      } else {
        messages.push({ role: "assistant", content: msg.text });
      }
    } else if (msg.role === "tool") {
      messages.push({ role: "tool", content: msg.content });
    }
  }

  const tools = options.tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model, messages, tools, stream: false, think: false,
          options: { temperature: options.temperature ?? 0.3, num_predict: maxTokens, num_ctx: numCtx },
        }),
      });
      clearTimeout(timer);
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof LlmFatalError) throw error;
      if (attempt === MAX_RETRIES) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new LlmFatalError(`Ollama chat failed after ${MAX_RETRIES + 1} attempts: ${detail}`);
      }
      console.warn(`[shopcheck] Ollama chat attempt ${attempt + 1} failed, retrying...`);
      await new Promise(r => setTimeout(r, attempt === 0 ? 5_000 : 15_000));
      continue;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const message = `Ollama chat error (${response.status}): ${detail || response.statusText}`;
      if (response.status === 401 || response.status === 403 || response.status === 404) throw new LlmFatalError(message);
      if (attempt === MAX_RETRIES) throw new LlmFatalError(`${message} (after ${MAX_RETRIES + 1} attempts)`);
      console.warn(`[shopcheck] Ollama chat attempt ${attempt + 1} HTTP error, retrying...`);
      await new Promise(r => setTimeout(r, attempt === 0 ? 5_000 : 15_000));
      continue;
    }

    type OllamaToolCall = { function?: { name?: string; arguments?: unknown } };
    type OllamaPayload = { message?: { content?: string; tool_calls?: OllamaToolCall[] }; error?: string };
    const payload = await response.json() as OllamaPayload;
    if (payload.error) throw new Error(`Ollama chat error: ${payload.error}`);
    const msg = payload.message;
    if (!msg) throw new Error("Ollama returned no message.");

    const rawText = msg.content ?? "";
    const stripped = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    let text = stripped;
    if (stripped.length < 50) {
      const thinkMatches = [...rawText.matchAll(/<think>([\s\S]*?)<\/think>/g)];
      if (thinkMatches.length > 0) {
        const inner = thinkMatches[thinkMatches.length - 1][1].trim();
        if (inner.length > stripped.length) text = inner;
      }
    }

    const toolCalls: ToolCall[] = [];
    for (const tc of (msg.tool_calls ?? [])) {
      const name = tc.function?.name ?? "";
      const rawArgs = tc.function?.arguments;
      const args: Record<string, unknown> = (typeof rawArgs === "object" && rawArgs !== null)
        ? rawArgs as Record<string, unknown>
        : (typeof rawArgs === "string" ? (() => { try { return JSON.parse(rawArgs); } catch { return {}; } })() : {});
      if (name) toolCalls.push({ id: `tc_${Date.now()}_${toolCalls.length}`, name, arguments: args });
    }
    return { text, toolCalls };
  }
  throw new LlmFatalError("Ollama chat: unexpected end of retry loop");
}

export async function llmChat(options: LlmChatOptions): Promise<LlmChatResponse> {
  return currentProvider === "ollama" ? llmChatOllama(options) : llmChatClaude(options);
}
