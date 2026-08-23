import { logger } from "../lib/logger.js";
import { isExternalUrl, isPublicFetchTarget } from "../lib/validate.js";

/** How long a lookup at somebody else's instance may take. */
const LOOKUP_TIMEOUT_MS = 5000;

/**
 * The profile picture behind a sponsor's social media address.
 *
 * Resolved on the server and stored with the sponsor, so a visitor's browser
 * never asks a foreign instance for a picture and the site keeps working when
 * that instance is down or gone.
 *
 * Mastodon and Bluesky are the two that answer such a question without a
 * credential. An address on any other platform yields nothing, and the editor
 * then gives the picture themselves.
 *
 * @param socialMedia - Platform keys against canonical profile addresses.
 * @returns The address of the picture, or `null` when none could be resolved.
 */
export async function resolveSponsorAvatar(
  socialMedia: Record<string, string>,
): Promise<string | null> {
  const mastodon = socialMedia.mastodon;
  if (mastodon) {
    const avatar = await lookupMastodonAvatar(mastodon);
    if (avatar) return avatar;
  }

  const bluesky = socialMedia.bluesky;
  if (bluesky) {
    const avatar = await lookupBlueskyAvatar(bluesky);
    if (avatar) return avatar;
  }

  return null;
}

/**
 * Asks a Mastodon instance for the picture of one of its accounts.
 *
 * @param profileUrl - A canonical profile address such as `https://host/@name`.
 * @returns The address of the picture, or `null`.
 */
async function lookupMastodonAvatar(profileUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(profileUrl);
  } catch {
    return null;
  }

  const account = parsed.pathname.replace(/^\/@/, "");
  if (!account || account.includes("/")) return null;

  const lookupUrl = `${parsed.origin}/api/v1/accounts/lookup?acct=${encodeURIComponent(account)}`;
  const data = await fetchJson<{ avatar_static?: string; avatar?: string }>(lookupUrl);
  return pictureUrl(data?.avatar_static ?? data?.avatar);
}

/**
 * Asks Bluesky's public API for the picture of an account.
 *
 * @param profileUrl - A canonical profile address such as
 *   `https://bsky.app/profile/name.bsky.social`.
 * @returns The address of the picture, or `null`.
 */
async function lookupBlueskyAvatar(profileUrl: string): Promise<string | null> {
  const handle = profileUrl.replace(/^https:\/\/bsky\.app\/profile\//, "");
  if (!handle || handle.includes("/")) return null;

  const lookupUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
  const data = await fetchJson<{ avatar?: string }>(lookupUrl);
  return pictureUrl(data?.avatar);
}

/**
 * Reads JSON from a public HTTPS address.
 *
 * The address is checked before the request and redirects are refused, because
 * the host comes from what an editor pasted and may point anywhere.
 *
 * @param url - The address to read.
 * @returns The parsed body, or `null` on any failure.
 */
async function fetchJson<T>(url: string): Promise<T | null> {
  if (!(await isPublicFetchTarget(url, { httpsOnly: true }))) return null;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (err) {
    logger.warn({ err, url }, "sponsor avatar lookup failed");
    return null;
  }
}

/**
 * Keeps an address only when a browser may safely load it as a picture.
 *
 * @param candidate - What the instance returned, which may be anything.
 * @returns The address, or `null` when it is not a public HTTPS one.
 */
function pictureUrl(candidate: string | undefined): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith("https://")) return null;
  if (!isExternalUrl(candidate)) return null;
  return candidate.length <= 500 ? candidate : null;
}
