/**
 * Well-known app settings keys stored in the `app_settings` table.
 */
export const SETTINGS_KEYS = {
  NOTIFY_SHOP_SUBMISSION_ENABLED: "notifications.newShopSubmission.enabled",
  NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID: "notifications.newShopSubmission.templateId",
  DOMAIN_ALERT_RULES: "submission.domainAlertRules",
  REDIRECT_URLS: "system.redirectUrls",
  // ── Automated shop review ────────────────────────────────────────────────
  // Everything the automated review needs at runtime lives here rather than in
  // the environment, so a change takes effect on the next worker tick instead
  // of on the next deployment. Which provider runs is a setting here too; the
  // key that authenticates against it is the one exception, because it is a
  // secret and stays in the environment.
  REVIEW_MODE: "review.mode",
  REVIEW_AUTO_APPLY_ACCEPT: "review.autoApplyAccept",
  REVIEW_AUTO_APPLY_REJECT: "review.autoApplyReject",
  REVIEW_PROVIDER: "review.provider",
  REVIEW_MODEL: "review.model",
  REVIEW_EFFORT: "review.effort",
  REVIEW_MAX_ATTEMPTS: "review.maxAttempts",
  REVIEW_COST_LIMIT_PER_CHECK_EUR: "review.costLimitPerCheckEur",
  REVIEW_COST_LIMIT_PER_DAY_EUR: "review.costLimitPerDayEur",
  REVIEW_REPORT_ENABLED: "review.report.enabled",
  REVIEW_REPORT_TEMPLATE_ID: "review.report.templateId",
  REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID: "review.notify.acceptTemplateId",
  REVIEW_NOTIFY_REJECT_TEMPLATE_ID: "review.notify.rejectTemplateId",
  REVIEW_SOCIAL_TEMPLATES: "review.social.templates",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/** Notification-related system settings keys. */
export const SYSTEM_NOTIFICATION_SETTINGS_KEYS = [
  SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED,
  SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID,
] as const;

/** Submission-related system settings keys. */
export const SYSTEM_SUBMISSION_SETTINGS_KEYS = [SETTINGS_KEYS.DOMAIN_ALERT_RULES] as const;

/** Redirect-related system settings keys. */
export const SYSTEM_REDIRECT_SETTINGS_KEYS = [SETTINGS_KEYS.REDIRECT_URLS] as const;

/** Automated shop review settings keys. */
export const SYSTEM_REVIEW_SETTINGS_KEYS = [
  SETTINGS_KEYS.REVIEW_MODE,
  SETTINGS_KEYS.REVIEW_AUTO_APPLY_ACCEPT,
  SETTINGS_KEYS.REVIEW_AUTO_APPLY_REJECT,
  SETTINGS_KEYS.REVIEW_PROVIDER,
  SETTINGS_KEYS.REVIEW_MODEL,
  SETTINGS_KEYS.REVIEW_EFFORT,
  SETTINGS_KEYS.REVIEW_MAX_ATTEMPTS,
  SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_CHECK_EUR,
  SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_DAY_EUR,
  SETTINGS_KEYS.REVIEW_REPORT_ENABLED,
  SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID,
  SETTINGS_KEYS.REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID,
  SETTINGS_KEYS.REVIEW_NOTIFY_REJECT_TEMPLATE_ID,
  SETTINGS_KEYS.REVIEW_SOCIAL_TEMPLATES,
] as const;

/** All keys exposed to the system settings UI. */
export const SYSTEM_SETTINGS_KEYS = [
  ...SYSTEM_NOTIFICATION_SETTINGS_KEYS,
  ...SYSTEM_SUBMISSION_SETTINGS_KEYS,
  ...SYSTEM_REDIRECT_SETTINGS_KEYS,
  ...SYSTEM_REVIEW_SETTINGS_KEYS,
] as const;

/**
 * Providers the automated review can run a check on.
 *
 * @remarks
 * A provider is named here rather than derived from the chosen model, because
 * the model list has to be fetched from somebody before there is a model to
 * derive anything from.
 */
export const REVIEW_PROVIDERS = ["anthropic", "mistral"] as const;

/** Union of the providers a check may run on. */
export type ReviewProviderName = (typeof REVIEW_PROVIDERS)[number];

/**
 * How each provider is named on screen.
 *
 * @remarks
 * Beside the list rather than in the locale files, because these are company
 * names and read the same in every language. Keeping them here also means a
 * provider cannot be added to the list without being given a name.
 */
export const REVIEW_PROVIDER_LABELS: Readonly<Record<ReviewProviderName, string>> = {
  anthropic: "Anthropic",
  mistral: "Mistral",
};

/**
 * The model each provider runs when none has been chosen for it.
 *
 * @remarks
 * A model belongs to exactly one provider, so a provider without a model of its
 * own has nothing to run. This is what a check falls back to when the model it
 * was configured with belongs to the other provider, which is a state the two
 * settings can otherwise reach on their own.
 */
export const REVIEW_PROVIDER_DEFAULT_MODELS: Readonly<Record<ReviewProviderName, string>> = {
  anthropic: "claude-opus-5",
  mistral: "mistral-medium-latest",
};

/**
 * The provider a check runs on until somebody chooses another.
 *
 * @remarks
 * Named once, because the settings defaults, the settings loader and the route
 * that lists models all need the same answer and three literals would drift.
 */
export const REVIEW_DEFAULT_PROVIDER: ReviewProviderName = "anthropic";

/**
 * Values the automated review falls back to when no setting has been saved.
 *
 * @remarks
 * These are the same defaults the dashboard shows on a fresh installation, so
 * the form and the worker cannot disagree about what "not configured yet"
 * means. Automation is off and applies nothing until somebody decides
 * otherwise.
 */
export const REVIEW_SETTING_DEFAULTS = {
  [SETTINGS_KEYS.REVIEW_MODE]: "off",
  [SETTINGS_KEYS.REVIEW_AUTO_APPLY_ACCEPT]: "false",
  [SETTINGS_KEYS.REVIEW_AUTO_APPLY_REJECT]: "false",
  [SETTINGS_KEYS.REVIEW_PROVIDER]: REVIEW_DEFAULT_PROVIDER,
  [SETTINGS_KEYS.REVIEW_MODEL]: REVIEW_PROVIDER_DEFAULT_MODELS[REVIEW_DEFAULT_PROVIDER],
  [SETTINGS_KEYS.REVIEW_EFFORT]: "high",
  [SETTINGS_KEYS.REVIEW_MAX_ATTEMPTS]: "3",
  [SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_CHECK_EUR]: "2",
  [SETTINGS_KEYS.REVIEW_COST_LIMIT_PER_DAY_EUR]: "10",
  [SETTINGS_KEYS.REVIEW_REPORT_ENABLED]: "false",
  [SETTINGS_KEYS.REVIEW_REPORT_TEMPLATE_ID]: "",
  // Empty by default, which means nothing is sent. The chosen template is the
  // switch: a decision the automation applies on its own already reaches the
  // public site, and writing to the person who suggested the shop is a further
  // step that is taken by choosing what to write.
  [SETTINGS_KEYS.REVIEW_NOTIFY_ACCEPT_TEMPLATE_ID]: "",
  [SETTINGS_KEYS.REVIEW_NOTIFY_REJECT_TEMPLATE_ID]: "",
  // Empty by default, which means nothing is posted. Each entry names an
  // account and the template it posts with, and an account without an entry
  // stays quiet.
  [SETTINGS_KEYS.REVIEW_SOCIAL_TEMPLATES]: "[]",
} as const;

/**
 * Reasoning effort levels the review may be configured with.
 *
 * @remarks
 * Listed from the cheapest to the most thorough, which is the order
 * {@link resolveEffortLevel} steps down through.
 */
export const REVIEW_EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;

/** Union of the configurable reasoning effort levels. */
export type ReviewEffortLevel = (typeof REVIEW_EFFORT_LEVELS)[number];

/**
 * Picks a level a given model accepts, without spending more than was asked.
 *
 * @param accepted - Levels the model accepts. An empty list means the model
 * takes no effort at all, which is a different answer from an unknown one.
 * @param configured - Level the operator chose.
 * @returns The chosen level where the model accepts it, otherwise the highest
 * accepted level below it, the cheapest accepted one when none is below, and
 * `null` when the model takes no effort.
 *
 * @remarks
 * Steps down rather than up, because a level above the chosen one costs more
 * than the operator asked to spend. Claude Sonnet 4.6 is the case this exists
 * for: it accepts `low`, `medium`, `high` and `max`, but not `xhigh`, so a
 * check configured for `xhigh` runs on `high` rather than on `max`. Claude
 * Sonnet 4.5 is the other case: it takes no effort, and a request carrying one
 * anyway is refused.
 */
export function resolveEffortLevel(
  accepted: readonly string[],
  configured: ReviewEffortLevel,
): ReviewEffortLevel | null {
  if (accepted.length === 0) return null;
  if (accepted.includes(configured)) return configured;

  const ranked = REVIEW_EFFORT_LEVELS.filter((level) => accepted.includes(level));
  if (ranked.length === 0) return null;

  const ceiling = REVIEW_EFFORT_LEVELS.indexOf(configured);
  const below = ranked.filter((level) => REVIEW_EFFORT_LEVELS.indexOf(level) < ceiling);
  return below.length > 0 ? below[below.length - 1] : ranked[0];
}
