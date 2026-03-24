import { DEFAULT_HOST } from "@lmaa/llm";
import { SETTINGS_KEYS } from "@lmaa/shared";

import { getSetting } from "../repositories/app-settings.js";

/**
 * Check if the Ollama instance is reachable.
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const host = (await getSetting(SETTINGS_KEYS.OLLAMA_HOST)) || DEFAULT_HOST;
    const response = await fetch(host, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}
