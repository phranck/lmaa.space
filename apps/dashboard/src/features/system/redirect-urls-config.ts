import { redirectUrlsConfigSchema, type RedirectUrlsConfig } from "@lmaa/contracts";

/**
 * Reads the redirect rules out of the setting they are stored in.
 *
 * @param raw - The setting as it is stored, or `undefined` before it loads.
 * @returns The rules, or an empty list where the setting is absent or unusable.
 *
 * @remarks
 * Shared rather than kept beside the page that edits the rules, because the
 * sidebar counts them and a second reading of the same string would be a second
 * answer to the question of what is stored there. Unusable content yields an
 * empty list rather than an error: the page shows nothing to edit, and the
 * count shows nothing to see, which is the same statement in both places.
 */
export function parseRedirectUrlsConfig(raw: string | undefined): RedirectUrlsConfig {
  if (!raw) return { redirects: [] };
  try {
    const parsed = redirectUrlsConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { redirects: [] };
  } catch {
    return { redirects: [] };
  }
}
