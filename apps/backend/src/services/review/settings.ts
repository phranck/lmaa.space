
import { z } from "zod";

import { templateAssignmentSchema } from "@lmaa/contracts";
import type { TemplateAssignment } from "@lmaa/contracts";
import type {
  ReviewAutomationMode,
  ReviewAutoApplyVerdict,
  ReviewEffortLevel,
  ReviewProviderName,
} from "@lmaa/shared";
import {
  REVIEW_AUTOMATION_MODES,
  REVIEW_DEFAULT_PROVIDER,
  REVIEW_EFFORT_LEVELS,
  REVIEW_PROVIDER_DEFAULT_MODELS,
  REVIEW_PROVIDERS,
  REVIEW_SETTING_DEFAULTS,
  SETTINGS_KEYS,
  SYSTEM_REVIEW_SETTINGS_KEYS,
} from "@lmaa/shared";

import { resolveReviewEffort } from "./models.js";
import { logger } from "../../lib/logger.js";
import { costLimitToNano, reviewProviderForModel } from "../../lib/review-cost.js";
import { getSettings } from "../../repositories/app-settings.js";

/**
 * The automated review's runtime configuration.
 */
export interface ReviewSettings {
  mode: ReviewAutomationMode;
  /** Verdicts that may be applied without a human. Empty unless somebody enabled one. */
  autoApply: ReviewAutoApplyVerdict[];
  /** Provider the check runs on, which decides which adapter the worker builds. */
  provider: ReviewProviderName;
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
  /**
   * Template an automatic admission is written with, or `null` when none is chosen.
   *
   * @remarks
   * The choice is the switch. No template means no mail, which is why there is
   * no separate flag beside it.
   */
  notifyAcceptTemplateId: number | null;
  /** Template an automatic rejection is written with, or `null` when none is chosen. */
  notifyRejectTemplateId: number | null;
  /**
   * Which social account posts an automatic admission, and with which template.
   *
   * @remarks
   * Empty unless somebody chose one, and an account whose entry carries no
   * template stays quiet. The same shape the manual admission sends, so both
   * go through one dispatch.
   */
  socialTemplates: TemplateAssignment[];
}

/**
 * The stored social choices, which are whatever the settings table holds.
 *
 * @remarks
 * Parsed rather than trusted: the table takes any string, and a malformed value
 * must mean that nothing is posted rather than that a check fails.
 */
const socialTemplatesSchema = z.array(templateAssignmentSchema);

function readSocialTemplates(raw: string): TemplateAssignment[] {
  try {
    const parsed = socialTemplatesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
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
 * Holds a configured model against the provider it will run on.
 *
 * @param provider - Provider the check is configured for.
 * @param model - Model the operator configured.
 * @returns The model where it belongs to that provider, and the provider's own
 * default model where it does not.
 *
 * @remarks
 * A model no card knows is left alone. It reaches its provider as configured
 * and fails there with the provider's own wording, which is more useful than
 * this quietly running something else.
 */
function resolveModelForProvider(provider: ReviewProviderName, model: string): string {
  const owner = reviewProviderForModel(model);
  if (owner === undefined || owner === provider) return model;

  const fallback = REVIEW_PROVIDER_DEFAULT_MODELS[provider];
  // Logged rather than silently corrected, because a setting that quietly
  // works is a setting nobody goes and puts right.
  logger.warn(
    { provider, configuredModel: model, belongsTo: owner, using: fallback },
    "review settings: the configured model belongs to another provider",
  );
  return fallback;
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

  const readTemplateId = (key: keyof typeof REVIEW_SETTING_DEFAULTS): number | null => {
    const raw = read(key).trim();
    const id = raw === "" ? Number.NaN : Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const templateId = readTemplateId(SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID);

  const provider = readEnum(
    read(SETTINGS_KEYS.REVIEW_PROVIDER),
    REVIEW_PROVIDERS,
    REVIEW_DEFAULT_PROVIDER,
  );

  // The two settings are stored apart and can therefore disagree, and when they
  // do the adapter for one provider is handed the other provider's model,
  // submits it, and has it refused. The provider is what stands, because it
  // decides which account is billed, so the model gives way instead.
  const model = resolveModelForProvider(
    provider,
    read(SETTINGS_KEYS.REVIEW_MODEL).trim() || REVIEW_SETTING_DEFAULTS[SETTINGS_KEYS.REVIEW_MODEL],
  );

  // Which levels a model accepts differs between models, so the stored level is
  // held against the model it will run on. Without this a level that was valid
  // when it was saved becomes a 400 as soon as the model changes.
  const effort = await resolveReviewEffort(
    provider,
    model,
    readEnum(read(SETTINGS_KEYS.REVIEW_EFFORT), REVIEW_EFFORT_LEVELS, "high"),
  );

  return {
    mode: readEnum(read(SETTINGS_KEYS.REVIEW_MODE), REVIEW_AUTOMATION_MODES, "off"),
    autoApply,
    provider,
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
    reportTemplateId: templateId,
    notifyAcceptTemplateId: readTemplateId(SETTINGS_KEYS.REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID),
    notifyRejectTemplateId: readTemplateId(SETTINGS_KEYS.REVIEW_NOTIFY_REJECT_TEMPLATE_ID),
    socialTemplates: readSocialTemplates(read(SETTINGS_KEYS.REVIEW_SOCIAL_TEMPLATES)),
  };
}
