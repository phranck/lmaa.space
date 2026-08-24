import { logger } from "../lib/logger.js";
import { type PreviewIntent, fetchPreviewImage } from "../lib/og.js";
import { isExternalUrl, isPublicFetchTarget } from "../lib/validate.js";

/** How long a lookup at somebody else's instance may take. */
const LOOKUP_TIMEOUT_MS = 5000;

/**
 * The services that hand out a portrait when asked directly.
 *
 * Measured on 2026-08-23: a Mastodon instance answers through its account
 * lookup, Bluesky through its public profile API, and GitHub and Codeberg both
 * serve a picture at the account's own address with `.png` appended. GitLab's
 * public user lookup answers a username with an empty list, so it is not here.
 */
const DIRECT_LOOKUPS: Readonly<Record<string, (address: string) => Promise<string | null>>> = {
  mastodon: lookupMastodonAvatar,
  bluesky: lookupBlueskyAvatar,
  github: lookupForgeAvatar,
  codeberg: lookupForgeAvatar,
};

/**
 * The order the addresses are tried in, from the closest likeness to the
 * loosest.
 *
 * A service that answers directly comes first, because what it returns is a
 * portrait of the person. Every other address is read as a page, which usually
 * yields the picture the profile itself shows. A website comes last: it has no
 * portrait, only its own mark, which is the right answer for somebody who gave
 * nothing else and the wrong one for somebody who did.
 */
function lookupOrder(socialMedia: Record<string, string>): string[] {
  const direct = Object.keys(DIRECT_LOOKUPS).filter((platform) => socialMedia[platform]);
  const rest = Object.keys(socialMedia).filter(
    (platform) => !direct.includes(platform) && platform !== "website",
  );
  return [...direct, ...rest.sort(), ...(socialMedia.website ? ["website"] : [])];
}

/**
 * The profile picture behind one of a sponsor's addresses.
 *
 * Resolved on the server and stored with the sponsor, so a visitor's browser
 * never asks a foreign instance for a picture and the site keeps working when
 * that instance is down or gone.
 *
 * Every service is covered, including the ones nobody has heard of, because a
 * platform without an API of its own is still a page, and the site's own
 * preview reader knows how to take a picture from a page. What it finds is
 * whatever that profile shows the world, which on most platforms is the
 * portrait and on a few is the platform's own banner. Whoever enters the
 * sponsor sees the result and can drop it.
 *
 * @param socialMedia - Platform keys against canonical profile addresses.
 * @returns The address of the picture, or `null` when none could be resolved.
 */
export async function resolveSponsorAvatar(
  socialMedia: Record<string, string>,
): Promise<string | null> {
  for (const platform of lookupOrder(socialMedia)) {
    const address = socialMedia[platform];
    if (!address) continue;

    const direct = DIRECT_LOOKUPS[platform];
    // A profile is read for the picture it shows of the person; a website is
    // read for its own mark. The same reader answers both, so which of the two
    // it is looking for has to be said here.
    const avatar = direct
      ? await direct(address)
      : await lookupSiteImage(address, platform === "website" ? "site-mark" : "portrait");
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
 * Asks a Gitea-style forge for the picture of one of its accounts.
 *
 * GitHub and Codeberg both serve it at the account's own address with `.png`
 * appended, and both answer without a credential. Verified on 2026-08-23:
 * `https://github.com/phranck.png` answers 200 with a JPEG, and
 * `https://codeberg.org/phranck.png` answers 200 with a PNG.
 *
 * @param profileUrl - A canonical profile address such as `https://host/name`.
 * @returns The address of the picture, or `null`.
 */
async function lookupForgeAvatar(profileUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(profileUrl);
  } catch {
    return null;
  }

  const account = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (!account || account.includes("/")) return null;

  const candidate = `${parsed.origin}/${encodeURIComponent(account)}.png`;
  if (!(await isPublicFetchTarget(candidate, { httpsOnly: true }))) return null;

  try {
    // Only the headers are needed. Whether the address answers with an image is
    // the whole question, and the picture itself is fetched by the reader.
    const response = await fetch(candidate, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    if (!response.headers.get("content-type")?.startsWith("image/")) return null;
    return pictureUrl(candidate);
  } catch (err) {
    logger.warn({ err, url: candidate }, "sponsor avatar lookup failed");
    return null;
  }
}

/**
 * Takes the picture a page shows.
 *
 * The site's preview reader already answers this question for shops: it reads
 * the page's own image, its icons and its manifest, measures every candidate
 * and takes the largest of the best kind. Pointed at a profile on any service,
 * that is usually the portrait the profile shows; pointed at a website, it is
 * the site's own mark. It needs to know nothing about the service, which is why
 * it covers the ones nobody has heard of.
 *
 * @param pageUrl - The address the sponsor gave.
 * @param intent - Whether the page is somebody's profile or their website,
 *   which decides whether the page's own picture or the site's mark is wanted.
 * @returns The address of the picture, or `null`.
 */
async function lookupSiteImage(pageUrl: string, intent: PreviewIntent): Promise<string | null> {
  try {
    const found = await fetchPreviewImage(pageUrl, { intent });
    return found ? pictureUrl(found.url) : null;
  } catch (err) {
    logger.warn({ err, url: pageUrl }, "sponsor avatar lookup failed");
    return null;
  }
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
