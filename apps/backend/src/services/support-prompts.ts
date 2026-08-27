import {
  SUPPORT_PROMPT_LIMIT_DEFAULTS,
  type SupportPromptLimits,
  supportPromptLimitsSchema,
} from "@lmaa/contracts";

import { logger } from "../lib/logger.js";
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
 * A value that can no longer be read is replaced by its own default and the
 * others are kept. Falling back to every default instead would discard settings
 * nobody complained about, which is what somebody sees as their choice silently
 * reverting. Whatever is dropped is logged, because a stored value that stopped
 * being valid means a rule changed under it.
 *
 * @returns The stored limits, each field falling back on its own.
 */
export async function getSupportPromptLimits(): Promise<SupportPromptLimits> {
  const raw = await getSetting(LIMITS_KEY);
  if (!raw) return SUPPORT_PROMPT_LIMIT_DEFAULTS;

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch (err) {
    logger.warn({ err, key: LIMITS_KEY }, "support prompt limits are not readable, using defaults");
    return SUPPORT_PROMPT_LIMIT_DEFAULTS;
  }

  const whole = supportPromptLimitsSchema.safeParse(stored);
  if (whole.success) return whole.data;

  const fields = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const dropped: string[] = [];

  /**
   * Reads one field, or notes that it was dropped.
   *
   * A field that is simply absent is not dropped; it never had a value to lose.
   */
  function read<K extends keyof SupportPromptLimits>(field: K): SupportPromptLimits[K] {
    const one = supportPromptLimitsSchema.shape[field].safeParse(fields[field]);
    if (one.success) return one.data as SupportPromptLimits[K];
    if (fields[field] !== undefined) dropped.push(`${field}=${JSON.stringify(fields[field])}`);
    return SUPPORT_PROMPT_LIMIT_DEFAULTS[field];
  }

  // Derived from the schema rather than listed, so a new limit is read here the
  // moment it is declared there. A list would be a second answer to the same
  // question, and the one that goes stale silently.
  const limits = Object.fromEntries(
    (Object.keys(supportPromptLimitsSchema.shape) as (keyof SupportPromptLimits)[]).map((field) => [
      field,
      read(field),
    ]),
  ) as SupportPromptLimits;

  logger.warn(
    { key: LIMITS_KEY, dropped, kept: limits },
    "support prompt limits partly unreadable, kept what could be read",
  );
  return limits;
}

/**
 * Stores the limits.
 *
 * @param limits - The values to keep, already validated by the route.
 */
export async function putSupportPromptLimits(limits: SupportPromptLimits): Promise<void> {
  await putSetting(LIMITS_KEY, JSON.stringify(limits));
}
