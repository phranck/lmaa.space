import { z } from "zod";

/** Ordered list of all supported social media platform keys. */
export const SOCIAL_PLATFORM_KEYS = [
  "instagram",
  "facebook",
  "threads",
  "tiktok",
  "youtube",
  "twitch",
  "x",
  "bluesky",
  "mastodon",
  "tumblr",
  "linkedin",
  "pinterest",
  "patreon",
  "mixcloud",
  "soundcloud",
  "website",
] as const;

/** Union type of all valid social media platform keys derived from `SOCIAL_PLATFORM_KEYS`. */
export type SocialPlatformKey = (typeof SOCIAL_PLATFORM_KEYS)[number];

const PLATFORM_SET = new Set<string>(SOCIAL_PLATFORM_KEYS);

function canonicalizePlatformKey(platform: string): string {
  return platform === "twitter" ? "x" : platform;
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function stripLeadingAt(s: string): string {
  return s.startsWith("@") ? s.slice(1) : s;
}

function tryParseUrl(s: string): URL | null {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

function stripWww(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

function isPinterestHost(host: string): boolean {
  return host.startsWith("pinterest.") || host.endsWith(".pinterest.com") || host === "pin.it";
}

function isFacebookHost(host: string): boolean {
  return host === "facebook.com" || host === "fb.com" || host.endsWith(".facebook.com");
}

function isLinkedinHost(host: string): boolean {
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

function isXHost(host: string): boolean {
  return host === "x.com" || host === "twitter.com" || host.endsWith(".x.com") || host.endsWith(".twitter.com");
}

function extractPathUser(url: URL): string {
  return stripTrailingSlash(url.pathname).split("/").pop() ?? "";
}

function normalizeInstagram(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "instagram.com") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://instagram.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://instagram.com/${handle}`;
}

function normalizeTiktok(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "tiktok.com") return null;
    const user = stripLeadingAt(extractPathUser(url));
    if (!user) return null;
    return `https://tiktok.com/@${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://tiktok.com/@${handle}`;
}

function normalizeYoutube(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "youtube.com" && host !== "youtu.be") return null;
    const path = stripTrailingSlash(url.pathname);

    // /channel/UCxxx or /c/name - keep as-is
    if (path.startsWith("/channel/") || path.startsWith("/c/")) {
      return `https://youtube.com${path}`;
    }

    // /@user
    const user = stripLeadingAt(extractPathUser(url));
    if (!user) return null;
    return `https://youtube.com/@${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://youtube.com/@${handle}`;
}

function normalizeTwitch(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "twitch.tv") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://twitch.tv/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://twitch.tv/${handle}`;
}

function normalizeX(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (!isXHost(host)) return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://x.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://x.com/${handle}`;
}

function normalizeBluesky(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "bsky.app") return null;
    const path = stripTrailingSlash(url.pathname);
    // /profile/handle.bsky.social or /profile/custom.domain
    if (!path.startsWith("/profile/")) return null;
    const handle = path.slice("/profile/".length);
    if (!handle) return null;
    return `https://bsky.app/profile/${handle}`;
  }

  // @handle or handle
  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;

  // Bare handle without dot -> append .bsky.social
  const fullHandle = handle.includes(".") ? handle : `${handle}.bsky.social`;
  return `https://bsky.app/profile/${fullHandle}`;
}

function normalizeMastodon(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    const path = stripTrailingSlash(url.pathname);
    // /@user or /web/@user
    let userPath = path;
    if (userPath.startsWith("/web/")) {
      userPath = userPath.slice(4);
    }
    if (!userPath.startsWith("/@")) return null;
    const user = userPath.slice(2);
    if (!user) return null;
    return `https://${host}/@${user}`;
  }

  // user@instance or @user@instance
  const cleaned = stripLeadingAt(trimmed);
  const atIndex = cleaned.indexOf("@");
  if (atIndex < 1) return null;
  const user = cleaned.slice(0, atIndex);
  const instance = cleaned.slice(atIndex + 1);
  if (!user || !instance || !instance.includes(".")) return null;
  return `https://${instance}/@${user}`;
}

function normalizeTumblr(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "tumblr.com") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://tumblr.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://tumblr.com/${handle}`;
}

function normalizeLinkedin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (!isLinkedinHost(host)) return null;
    const path = stripTrailingSlash(url.pathname);

    // /in/slug or /company/slug
    if (path.startsWith("/in/") || path.startsWith("/company/")) {
      return `https://linkedin.com${path}`;
    }
    return null;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://linkedin.com/in/${handle}`;
}

function normalizeFacebook(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (!isFacebookHost(host)) return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://facebook.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://facebook.com/${handle}`;
}

function normalizeThreads(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "threads.net") return null;
    const user = stripLeadingAt(extractPathUser(url));
    if (!user) return null;
    return `https://threads.net/@${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://threads.net/@${handle}`;
}

function normalizePinterest(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (!isPinterestHost(host)) return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://pinterest.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://pinterest.com/${handle}`;
}

function normalizePatreon(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "patreon.com") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://patreon.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://patreon.com/${handle}`;
}

function normalizeMixcloud(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "mixcloud.com") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://mixcloud.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://mixcloud.com/${handle}`;
}

function normalizeSoundcloud(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "soundcloud.com") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://soundcloud.com/${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://soundcloud.com/${handle}`;
}

function normalizeWebsite(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = tryParseUrl(withScheme);
  if (!url) return null;
  return url.href;
}

const DOMAIN_TO_PLATFORM: Record<string, SocialPlatformKey> = {
  "instagram.com": "instagram",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "threads.net": "threads",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "twitch.tv": "twitch",
  "x.com": "x",
  "twitter.com": "x",
  "bsky.app": "bluesky",
  "linkedin.com": "linkedin",
  "pin.it": "pinterest",
  "patreon.com": "patreon",
  "tumblr.com": "tumblr",
  "mixcloud.com": "mixcloud",
  "soundcloud.com": "soundcloud",
};

/**
 * Infers a social media platform from a URL string.
 *
 * Returns `null` when the host does not match any known platform or the input
 * cannot be parsed as a URL.
 *
 * @param input - A URL string (with or without protocol prefix).
 * @returns The matching `SocialPlatformKey`, or `null` if unrecognised.
 */
export function detectPlatformFromUrl(input: string): SocialPlatformKey | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = tryParseUrl(withScheme);
  if (!url) return null;

  const host = stripWww(url.hostname);

  // Direct domain match
  const direct = DOMAIN_TO_PLATFORM[host];
  if (direct) return direct;

  if (isFacebookHost(host)) return "facebook";
  if (isLinkedinHost(host)) return "linkedin";
  if (isXHost(host)) return "x";

  if (isPinterestHost(host)) return "pinterest";

  // Mastodon heuristic: path starts with /@ or /web/@
  const path = stripTrailingSlash(url.pathname);
  if (path.startsWith("/@") || path.startsWith("/web/@")) return "mastodon";

  return null;
}

const normalizers: Record<SocialPlatformKey, (input: string) => string | null> = {
  instagram: normalizeInstagram,
  facebook: normalizeFacebook,
  threads: normalizeThreads,
  tiktok: normalizeTiktok,
  youtube: normalizeYoutube,
  twitch: normalizeTwitch,
  x: normalizeX,
  bluesky: normalizeBluesky,
  mastodon: normalizeMastodon,
  tumblr: normalizeTumblr,
  linkedin: normalizeLinkedin,
  pinterest: normalizePinterest,
  patreon: normalizePatreon,
  mixcloud: normalizeMixcloud,
  soundcloud: normalizeSoundcloud,
  website: normalizeWebsite,
};

/**
 * Normalizes a raw social media handle or URL to a canonical profile URL.
 *
 * Accepts bare handles (with or without `@`), full URLs, and short-form inputs.
 * Returns `null` when the input cannot be normalized for the given platform.
 *
 * @param platform - Platform key (e.g. `"instagram"`). `"twitter"` is aliased to `"x"`.
 * @param input - Raw user input such as `"@myshop"` or `"https://instagram.com/myshop"`.
 * @returns Canonical profile URL string, or `null` if normalization fails.
 */
export function normalizeSocialMediaValue(platform: string, input: string): string | null {
  const canonicalPlatform = canonicalizePlatformKey(platform);
  const fn = normalizers[canonicalPlatform as SocialPlatformKey];
  if (!fn) return null;
  return fn(input);
}

/**
 * Zod schema that validates and normalizes a social media map.
 *
 * Accepts a `Record<string, string>` where each key is a platform key and each
 * value is a raw handle or URL. Unknown platforms and invalid values produce
 * Zod issues. Valid values are transformed to canonical profile URLs.
 */
export const socialMediaSchema = z
  .record(z.string(), z.string())
  .optional()
  .transform((val, ctx) => {
    if (!val) return undefined;

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(val)) {
      const canonicalKey = canonicalizePlatformKey(key);

      if (!PLATFORM_SET.has(canonicalKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown social media platform: ${key}`,
          path: [key],
        });
        continue;
      }

      if (!value) continue;

      const normalized = normalizeSocialMediaValue(canonicalKey, value);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid value for ${key}: ${value}`,
          path: [key],
        });
        continue;
      }

      result[canonicalKey] = normalized;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  });
