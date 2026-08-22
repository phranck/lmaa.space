import {
  SUPPORT_PROMPT_LIMIT_DEFAULTS,
  type SupportPromptLimits,
  supportPromptLimitsSchema,
} from "@lmaa/contracts";

import { getSetting, putSetting } from "../repositories/app-settings.js";

/** Where the limits live in the settings table. */
const LIMITS_KEY = "supportPrompts.limits";

/**
 * Returns what bounds one reader across every prompt together.
 *
 * These are deliberately not per prompt. A ceiling each prompt could raise
 * bounds nothing, and with several prompts active a reader would otherwise see
 * their sum rather than the limit.
 *
 * @returns The stored limits, or the defaults when nothing is stored or what is
 *   stored can no longer be read.
 */
export async function getSupportPromptLimits(): Promise<SupportPromptLimits> {
  const raw = await getSetting(LIMITS_KEY);
  if (!raw) return SUPPORT_PROMPT_LIMIT_DEFAULTS;

  try {
    const parsed = supportPromptLimitsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : SUPPORT_PROMPT_LIMIT_DEFAULTS;
  } catch {
    return SUPPORT_PROMPT_LIMIT_DEFAULTS;
  }
}

/**
 * Stores the limits.
 *
 * @param limits - The values to keep, already validated by the route.
 */
export async function putSupportPromptLimits(limits: SupportPromptLimits): Promise<void> {
  await putSetting(LIMITS_KEY, JSON.stringify(limits));
}
