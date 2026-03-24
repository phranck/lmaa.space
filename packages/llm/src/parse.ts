/**
 * Strip `<think>...</think>` blocks from model output.
 * Some models (qwen, deepseek) wrap reasoning in think blocks.
 */
export function stripThinkingBlocks(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/**
 * Rough token estimate: ~4 chars per token for English/German text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Attempt to parse a JSON object or array from raw LLM output.
 *
 * Handles common LLM quirks:
 * - Think blocks before/after JSON
 * - Markdown code fences (```json ... ```)
 * - Leading/trailing garbage text
 * - Single-line // comments inside JSON
 */
export function tryParseJson<T = unknown>(raw: string): T | null {
  const cleaned = stripThinkingBlocks(raw);

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // continue
  }

  // Try extracting from markdown code fence
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // Bracket scanning: find first { or [ and match to closing bracket
  const startObj = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");

  let start: number;
  let openChar: string;
  let closeChar: string;

  if (startObj === -1 && startArr === -1) return null;

  if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
    start = startObj;
    openChar = "{";
    closeChar = "}";
  } else {
    start = startArr;
    openChar = "[";
    closeChar = "]";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) depth++;
    else if (ch === closeChar) depth--;

    if (depth === 0) {
      const candidate = cleaned.slice(start, i + 1);

      // Strip single-line comments
      const noComments = candidate.replace(
        /^(\s*)\/\/.*$/gm,
        "$1",
      );

      try {
        return JSON.parse(noComments) as T;
      } catch {
        return null;
      }
    }
  }

  return null;
}
