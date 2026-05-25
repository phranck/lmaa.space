import { z } from "zod";

/** Maximum number of configurable public redirect URLs. */
export const REDIRECT_URLS_MAX = 100;

/** URL-safe public redirect name pattern used in `/r/:name`. */
export const REDIRECT_URL_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalizes a redirect URL name for use in the public `/r/:name` route.
 *
 * @param input - Raw admin-entered name.
 * @returns Lowercase URL-safe name with repeated separators collapsed.
 */
export function normalizeRedirectUrlName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

/** Schema for one configurable public redirect URL. */
export const redirectUrlEntrySchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().regex(REDIRECT_URL_NAME_PATTERN),
  targetUrl: z.string().trim().max(2048).refine(isHttpUrl, {
    message: "Target URL must be an absolute http(s) URL.",
  }),
  openInNewWindow: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/** Config schema for all configurable public redirect URLs. */
export const redirectUrlsConfigSchema = z.object({
  redirects: z.array(redirectUrlEntrySchema).max(REDIRECT_URLS_MAX),
});

/** One configurable public redirect URL. */
export type RedirectUrlEntry = z.infer<typeof redirectUrlEntrySchema>;

/** Persisted config for all configurable public redirect URLs. */
export type RedirectUrlsConfig = z.infer<typeof redirectUrlsConfigSchema>;
