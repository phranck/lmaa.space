import { z } from "zod";

/** Ordered list of all supported social media platform keys. */
export const SOCIAL_PLATFORM_KEYS = [
  "applepodcasts",
  "mastodon",
  "bluesky",
  "instagram",
  "facebook",
  "whatsapp",
  "signal",
  "discord",
  "threads",
  "tiktok",
  "x",
  "youtube",
  "twitch",
  "tumblr",
  "linkedin",
  "pinterest",
  "patreon",
  "mixcloud",
  "soundcloud",
  "spotify",
  "github",
  "gitlab",
  "codeberg",
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

function isTumblrHost(host: string): boolean {
  return host === "tumblr.com" || host.endsWith(".tumblr.com");
}

const LINKEDIN_RESERVED_PATHS = new Set([
  "in",
  "company",
  "school",
  "groups",
  "learning",
  "jobs",
  "posts",
  "pulse",
  "feed",
  "me",
  "notifications",
  "messaging",
  "mynetwork",
  "events",
  "services",
  "pages",
  "help",
  "pricing",
  "login",
  "signup",
  "news",
  "careers",
  "legal",
  "terms",
  "policies",
  "products",
  "ads",
  "marketing",
  "premium",
  "recruiter",
  "search",
  "profile",
  "settings",
  "security",
  "privacy",
  "account",
  "today",
  "showcase",
  "influencer",
  "talent",
  "business",
  "sales",
  "mobile",
  "pub",
  "public-profile",
]);

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

    // Subdomain form: <user>.tumblr.com (canonical Tumblr profile URL)
    if (host.endsWith(".tumblr.com")) {
      const user = host.slice(0, -".tumblr.com".length);
      if (!user) return null;
      return `https://${user}.tumblr.com`;
    }

    // Path form: tumblr.com/<user> → normalize to subdomain form
    if (host !== "tumblr.com") return null;
    const user = extractPathUser(url);
    if (!user) return null;
    return `https://${user}.tumblr.com`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/") || handle.includes(".")) return null;
  return `https://${handle}.tumblr.com`;
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

    // Vanity path: linkedin.com/<slug> → linkedin.com/in/<slug>
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1 && !LINKEDIN_RESERVED_PATHS.has(segments[0].toLowerCase())) {
      return `https://linkedin.com/in/${segments[0]}`;
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

function isThreadsHost(host: string): boolean {
  return host === "threads.net" || host === "threads.com";
}

function normalizeThreads(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (!isThreadsHost(host)) return null;
    const user = stripLeadingAt(extractPathUser(url));
    if (!user) return null;
    return `https://www.threads.com/@${user}`;
  }

  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://www.threads.com/@${handle}`;
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

function normalizeApplepodcasts(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "podcasts.apple.com") return null;
    // Accept any valid Apple Podcasts URL as-is (incl. locale paths like /de/podcast/...)
    return url.href;
  }

  // Bare numeric ID (with or without "id" prefix)
  const id = trimmed.replace(/^id/, "");
  if (!id || !/^\d+$/.test(id)) return null;
  return `https://podcasts.apple.com/podcast/id${id}`;
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

function normalizeSpotify(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host !== "open.spotify.com" && host !== "spotify.com") return null;
    return url.href;
  }

  // Bare handle → artist page
  const handle = stripLeadingAt(trimmed);
  if (!handle || handle.includes("/")) return null;
  return `https://open.spotify.com/artist/${handle}`;
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

function normalizeWhatsapp(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host === "wa.me" || host === "whatsapp.com") return stripTrailingSlash(url.href);
    return null;
  }

  // Accept phone numbers: +49..., 0049..., or plain digits with optional spaces/dashes
  const digits = trimmed.replace(/[\s\-().]/g, "");
  const normalized = digits.startsWith("00") ? digits.slice(2) : digits.startsWith("+") ? digits.slice(1) : digits;
  if (/^\d{6,15}$/.test(normalized)) return `https://wa.me/${normalized}`;
  return null;
}

function normalizeSignal(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const url = tryParseUrl(trimmed);
  if (url) {
    const host = stripWww(url.hostname);
    if (host === "signal.me" || host === "signal.group") return stripTrailingSlash(url.href);
    return null;
  }

  return null;
}

function normalizeDiscord(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = tryParseUrl(withScheme);
  if (url) {
    const host = stripWww(url.hostname);
    const path = stripTrailingSlash(url.pathname);
    const segments = path.split("/").filter(Boolean);

    if (host === "discord.gg") {
      const inviteCode = segments[0];
      if (!inviteCode) return null;
      return `https://discord.gg/${inviteCode}`;
    }

    if (host === "discord.com" || host === "discordapp.com") {
      const [section, ...rest] = segments;
      const firstValue = rest[0];
      if (section === "invite" && firstValue) {
        return `https://discord.gg/${firstValue}`;
      }
      if ((section === "users" || section === "channels" || section === "servers") && firstValue) {
        return `https://discord.com/${[section, ...rest].join("/")}`;
      }
      return null;
    }
  }

  const inviteCode = stripLeadingAt(trimmed);
  if (!inviteCode || /[/?#\s]/.test(inviteCode)) return null;
  return `https://discord.gg/${inviteCode}`;
}

function normalizeWebsite(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A page is reached over http or https. Anything else naming a scheme is
  // refused rather than having one put in front of it, which would turn
  // `ftp://x.test` into `https://ftp//x.test` and store that as an address.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const isWeb = /^https?:\/\//i.test(trimmed);
  if (hasScheme && !isWeb) return null;

  const url = tryParseUrl(isWeb ? trimmed : `https://${trimmed}`);
  if (!url) return null;
  // Nobody writes their credentials into their own address, so anything with a
  // user in front of the host arrived there by accident or by intent. Both
  // shapes read as an address on the host and are not one.
  if (url.username || url.password) return null;
  // A host with no dot in it is not a name reached from the internet, so a
  // single word does not become `https://word/`.
  if (!url.hostname.includes(".")) return null;
  return url.href;
}

const DOMAIN_TO_PLATFORM: Record<string, SocialPlatformKey> = {
  "instagram.com": "instagram",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "threads.net": "threads",
  "threads.com": "threads",
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
  "podcasts.apple.com": "applepodcasts",
  "open.spotify.com": "spotify",
  "spotify.com": "spotify",
  "wa.me": "whatsapp",
  "whatsapp.com": "whatsapp",
  "signal.me": "signal",
  "signal.group": "signal",
  "discord.gg": "discord",
  "discord.com": "discord",
  "discordapp.com": "discord",
  "github.com": "github",
  "gist.github.com": "github",
  "gitlab.com": "gitlab",
  "codeberg.org": "codeberg",
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
  if (isTumblrHost(host)) return "tumblr";

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
  applepodcasts: normalizeApplepodcasts,
  mixcloud: normalizeMixcloud,
  soundcloud: normalizeSoundcloud,
  spotify: normalizeSpotify,
  whatsapp: normalizeWhatsapp,
  signal: normalizeSignal,
  discord: normalizeDiscord,
  github: normalizeWebsite,
  gitlab: normalizeWebsite,
  codeberg: normalizeWebsite,
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
 * `user@instance.tld`, with or without the leading `@`, being how a fediverse
 * address is written where it is not written as a link.
 */
const FEDIVERSE_HANDLE = /^@?[^@\s/]+@[^@\s/]+\.[^@\s/]+$/;

/**
 * Sorts one address a person typed into the service it belongs to.
 *
 * Somebody giving their address should not first have to say what kind it is.
 * The list of services and the shapes their addresses take is already here, so
 * the sorting is ours to do rather than theirs.
 *
 * An address on none of the known services is a website, which is a service in
 * its own right here rather than a leftover.
 *
 * @param input - What the person typed, with or without a scheme.
 * @returns The platform key and the canonical address, or `null` when the input
 *   is not an address at all.
 */
export function classifyProfileLink(
  input: string,
): { platform: SocialPlatformKey; url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A fediverse handle is answered before anything else, because it carries no
  // scheme and putting one in front of it makes the part before the second `@`
  // into userinfo: `@kim@chaos.social` would come out as a website on
  // `chaos.social` belonging to a user called `@kim`.
  if (FEDIVERSE_HANDLE.test(trimmed)) {
    const handleUrl = normalizeSocialMediaValue("mastodon", trimmed);
    if (handleUrl) return { platform: "mastodon", url: handleUrl };
  }

  const platform = detectPlatformFromUrl(trimmed) ?? "website";
  const url = normalizeSocialMediaValue(platform, trimmed);
  return url ? { platform, url } : null;
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
