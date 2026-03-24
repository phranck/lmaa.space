import { DEFAULT_HOST } from "@lmaa/llm";

import { env } from "../config/env.js";

function getHost(): string {
  return env.OLLAMA_HOST ?? DEFAULT_HOST;
}

/**
 * Check if the Ollama instance is reachable.
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(getHost(), { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}
