import {
  REVIEW_AUTOMATION_MODES,
  REVIEW_EFFORT_LEVELS,
  REVIEW_SETTING_DEFAULTS,
  SETTINGS_KEYS,
  SYSTEM_REVIEW_SETTINGS_KEYS,
} from "@lmaa/shared";
import type { ReviewAutomationMode, ReviewAutoApplyVerdict, ReviewEffortLevel } from "@lmaa/shared";

import { resolveReviewEffort } from "./models.js";
import { costLimitToNano } from "../../lib/review-cost.js";
import { getSettings } from "../../repositories/app-settings.js";

/**
 * The automated review's runtime configuration.
 */
export interface ReviewSettings {
  mode: ReviewAutomationMode;
  /** Verdicts that may be applied without a human. Empty unless somebody enabled one. */
  autoApply: ReviewAutoApplyVerdict[];
  model: string;
  /** Reasoning effort for the run, or `null` where the model takes none. */
  effort: ReviewEffortLevel | null;
  maxAttempts: number;
  /** Ceiling for one check, in nano-units of the rate card currency. */
  costLimitPerCheckNano: bigint;
  /** Ceiling for one UTC day, in nano-units of the rate card currency. */
  costLimitPerDayNano: bigint;
  reportEnabled: boolean;
  /** Email template the report is rendered with, or `null` when none is chosen. */
  reportTemplateId: number | null;
}

function readEnum<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = raw?.trim().toLowerCase();
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function readBoolean(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === "true";
}

/**
 * Loads the automated review's configuration.
 *
 * @returns The settings, with defaults filled in for anything unsaved.
 *
 * @remarks
 * Read fresh on every worker tick rather than cached, so a change saved in the
 * dashboard takes effect on the next tick. The values are a handful of short
 * strings from one indexed table, which costs far less than the surprise of a
 * setting that only applies after a restart.
 *
 * Every value is clamped to a sensible range rather than trusted. The settings
 * table takes any string, and a mistyped ceiling must not become an unbounded
 * one.
 */
export async function loadReviewSettings(): Promise<ReviewSettings> {
  const stored = await getSettings([...SYSTEM_REVIEW_SETTINGS_KEYS]);
  const read = (key: keyof typeof REVIEW_SETTING_DEFAULTS): string =>
    stored[key] ?? REVIEW_SETTING_DEFAULTS[key];

  const autoApply: ReviewAutoApplyVerdict[] = [];
  if (readBoolean(read(SETTINGS_KEYS.REVIEW_AUTO_APPLY_ACCEPT))) autoApply.push("accept");
  if (readBoolean(read(SETTINGS_KEYS.REVIEW_AUTO_APPLY_REJECT))) autoApply.push("reject");

  const templateIdRaw = read(SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID).trim();
  const templateId = templateIdRaw === "" ? Number.NaN : Number(templateIdRaw);

  const model =
    read(SETTINGS_KEYS.REVIEW_MODEL).trim() || REVIEW_SETTING_DEFAULTS[SETTINGS_KEYS.REVIEW_MODEL];

  // Which levels a model accepts differs between models, so the stored level is
  // held against the model it will run on. Without this a level that was valid
  // when it was saved becomes a 400 as soon as the model changes.
  const effort = await resolveReviewEffort(
    model,
    readEnum(read(SETTINGS_KEYS.REVIEW_EFFORT), REVIEW_EFFORT_LEVELS, "high"),
  );

  return {
    mode: readEnum(read(SETTINGS_KEYS.REVIEW_MODE), REVIEW_AUTOMATION_MODES, "off"),
    autoApply,
    model,
    effort,
    maxAttempts: Math.round(readNumber(read(SETTINGS_KEYS.REVIEW_MAX_ATTEMPTS), 3, 1, 10)),
    costLimitPerCheckNano: costLimitToNano(
      readNumber(read(SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_CHECK_EUR), 2, 0.01, 1000),
    ),
    costLimitPerDayNano: costLimitToNano(
      readNumber(read(SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_DAY_EUR), 10, 0.01, 10_000),
    ),
    reportEnabled: readBoolean(read(SETTINGS_KEYS.REVIEW_REPORT_ENABLED)),
    reportTemplateId: Number.isFinite(templateId) && templateId > 0 ? templateId : null,
  };
}
