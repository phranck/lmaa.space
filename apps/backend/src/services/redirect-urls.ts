import {
  normalizeRedirectUrlName,
  redirectUrlsConfigSchema,
  type RedirectUrlsConfig,
} from "@lmaa/contracts";
import { SETTINGS_KEYS } from "@lmaa/shared";

import { getSetting } from "../repositories/app-settings.js";

const EMPTY_REDIRECT_URLS_CONFIG: RedirectUrlsConfig = { redirects: [] };

export interface ResolvedRedirectUrl {
  openInNewWindow: boolean;
  targetUrl: string;
}

/**
 * Loads the managed public redirect URL config from app settings.
 *
 * @returns Persisted config, or an empty config when the setting is absent or invalid.
 */
async function getManagedRedirectUrlsConfig(): Promise<RedirectUrlsConfig> {
  const raw = await getSetting(SETTINGS_KEYS.REDIRECT_URLS);
  if (!raw) return EMPTY_REDIRECT_URLS_CONFIG;

  try {
    const parsed = redirectUrlsConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_REDIRECT_URLS_CONFIG;
  } catch {
    return EMPTY_REDIRECT_URLS_CONFIG;
  }
}

/**
 * Resolves a public redirect by its internal URL name.
 *
 * @param nameRaw - Raw route parameter from `/r/:name`.
 * @returns Active target URL, or `null` when no redirect exists.
 */
export async function resolveManagedRedirectUrl(
  nameRaw: string,
): Promise<ResolvedRedirectUrl | null> {
  const name = normalizeRedirectUrlName(nameRaw);
  if (!name) return null;

  const config = await getManagedRedirectUrlsConfig();
  const redirect = config.redirects.find((entry) => entry.isActive && entry.name === name);
  if (!redirect) return null;

  return {
    openInNewWindow: redirect.openInNewWindow,
    targetUrl: redirect.targetUrl,
  };
}
