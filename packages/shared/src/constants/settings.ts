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
