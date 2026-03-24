/**
 * Well-known app settings keys stored in the `app_settings` table.
 */
export const SETTINGS_KEYS = {
  OLLAMA_HOST: "ollama.host",
  OLLAMA_API_KEY: "ollama.apiKey",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/** Keys exposed to the affiliate settings UI. */
export const AFFILIATE_SETTINGS_KEYS = [
  SETTINGS_KEYS.OLLAMA_HOST,
  SETTINGS_KEYS.OLLAMA_API_KEY,
] as const;
