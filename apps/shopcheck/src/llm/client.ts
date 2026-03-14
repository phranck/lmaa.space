import Anthropic from "@anthropic-ai/sdk";

/** Fatal error that should stop the entire run (e.g. auth failure, no credits). */
export class LlmFatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmFatalError";
  }
}

export type LlmTask = "extraction" | "narrative";

export type LlmGenerateOptions = {
  prompt: string;
  task: LlmTask;
  temperature?: number;
};

const CLAUDE_EXTRACTION_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_NARRATIVE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_MAX_TOKENS_EXTRACTION = 8192;
const CLAUDE_MAX_TOKENS_NARRATIVE = 2048;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new LlmFatalError("ANTHROPIC_API_KEY environment variable is not set.");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

function modelForTask(task: LlmTask): { model: string; maxTokens: number } {
  if (task === "narrative") return { model: CLAUDE_NARRATIVE_MODEL, maxTokens: CLAUDE_MAX_TOKENS_NARRATIVE };
  return { model: CLAUDE_EXTRACTION_MODEL, maxTokens: CLAUDE_MAX_TOKENS_EXTRACTION };
}

export function getModelName(task: LlmTask): string {
  return modelForTask(task).model;
}

export async function llmGenerate(options: LlmGenerateOptions): Promise<string> {
  const client = getAnthropicClient();
  const { model, maxTokens } = modelForTask(options.task);

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
