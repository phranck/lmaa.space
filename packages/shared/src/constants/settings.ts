/**
 * Well-known app settings keys stored in the `app_settings` table.
 */
export const SETTINGS_KEYS = {
  OLLAMA_HOST: "ollama.host",
  OLLAMA_API_KEY: "ollama.apiKey",
  AWIN_PUBLISHER_ID: "awin.publisherId",
  AWIN_API_TOKEN: "awin.apiToken",
  TRADEDOUBLER_PUBLISHER_ID: "tradedoubler.publisherId",
  TRADEDOUBLER_TOKEN: "tradedoubler.token",
  ADCELL_PUBLISHER_ID: "adcell.publisherId",
  ADCELL_API_PASSWORD: "adcell.apiPassword",
  NOTIFY_SHOP_SUBMISSION_ENABLED: "notifications.newShopSubmission.enabled",
  NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID: "notifications.newShopSubmission.templateId",
  MASTODON_APPROVAL_TEMPLATE_ID: "social.mastodon.approvalTemplateId",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/** Ollama-specific settings keys. */
export const OLLAMA_SETTINGS_KEYS = [
  SETTINGS_KEYS.OLLAMA_HOST,
  SETTINGS_KEYS.OLLAMA_API_KEY,
] as const;

/** Awin-specific settings keys. */
export const AWIN_SETTINGS_KEYS = [
  SETTINGS_KEYS.AWIN_PUBLISHER_ID,
  SETTINGS_KEYS.AWIN_API_TOKEN,
] as const;

/** Tradedoubler-specific settings keys. */
export const TRADEDOUBLER_SETTINGS_KEYS = [
  SETTINGS_KEYS.TRADEDOUBLER_PUBLISHER_ID,
  SETTINGS_KEYS.TRADEDOUBLER_TOKEN,
] as const;

/** Adcell-specific settings keys. */
export const ADCELL_SETTINGS_KEYS = [
  SETTINGS_KEYS.ADCELL_PUBLISHER_ID,
  SETTINGS_KEYS.ADCELL_API_PASSWORD,
] as const;

/** All keys exposed to the affiliate settings UI. */
export const AFFILIATE_SETTINGS_KEYS = [
  ...OLLAMA_SETTINGS_KEYS,
  ...AWIN_SETTINGS_KEYS,
  ...TRADEDOUBLER_SETTINGS_KEYS,
  ...ADCELL_SETTINGS_KEYS,
] as const;

/** Notification-related system settings keys. */
export const SYSTEM_NOTIFICATION_SETTINGS_KEYS = [
  SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_ENABLED,
  SETTINGS_KEYS.NOTIFY_SHOP_SUBMISSION_TEMPLATE_ID,
] as const;

/** All keys exposed to the system settings UI. */
export const SYSTEM_SETTINGS_KEYS = [...SYSTEM_NOTIFICATION_SETTINGS_KEYS] as const;
