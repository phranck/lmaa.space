import { logger } from "../lib/logger.js";
import { extractHomepage, fetchExternalResource } from "../lib/og.js";

/** How long the two requests a favicon needs may take, each. */
const FAVICON_TIMEOUT_MS = 5000;

/**
 * How large an icon may be before it is refused.
 *
 * A site mark is a few kilobytes. Anything past this is a photograph somebody
 * pointed a `rel="icon"` at, and it travels inside the page rather than being
 * fetched separately, so its size is paid on every render.
 */
const MAX_ICON_BYTES = 100 * 1024;

/** How long a resolved icon is held before the site is asked again. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Upper bound on held entries, so a long-running server cannot grow unbounded. */
const MAX_CACHE_ENTRIES = 500;

/** The image types an icon may be. Anything else is not shown. */
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/avif",
]);

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; lmaa.space/1.0; +https://lmaa.space)",
} as const;

/** How much HTML is read whilst looking for the icon links in its head. */
const MAX_HTML_BYTES = 512 * 1024;

const cache = new Map<string, { dataUrl: string | null; expiresAt: number }>();

/**
 * The site's own small mark, as data rather than as an address.
 *
 * Returned inline so the page carries the icon itself. A visitor's browser then
 * never asks a sponsor's website for anything, which it would have to do if the
 * page merely named the icon's address, and every sponsor site would learn who
 * is reading the page.
 *
 * @param address - Any address on the site in question.
 * @returns The icon as a `data:` URL, or `null` when the site has none that can
 *   be read.
 */
export async function resolveFavicon(address: string): Promise<string | null> {
  let homepage: string;
  try {
    homepage = extractHomepage(address);
  } catch {
    return null;
  }

  const cached = cache.get(homepage);
  if (cached && cached.expiresAt > Date.now()) return cached.dataUrl;

  const dataUrl = await readFavicon(homepage);
  remember(homepage, dataUrl);
  return dataUrl;
}

/**
 * Holds one answer, including the answer that a site has no icon.
 *
 * A site without one is asked again no sooner than a site with one, because
 * looking for something that is not there costs the same two requests.
 */
function remember(homepage: string, dataUrl: string | null): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(homepage, { dataUrl, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Finds and reads a site's icon.
 *
 * The page's own `rel="icon"` links come first, because a site that declares
 * one has said which mark it wants shown. `/favicon.ico` is the fallback that
 * every browser tries, and plenty of sites serve it without ever mentioning it.
 *
 * @param homepage - The site's origin.
 * @returns The icon as a `data:` URL, or `null`.
 */
async function readFavicon(homepage: string): Promise<string | null> {
  const declared = await declaredIconUrls(homepage);

  for (const candidate of [...declared, `${homepage}/favicon.ico`]) {
    const dataUrl = await fetchAsDataUrl(candidate);
    if (dataUrl) return dataUrl;
  }

  return null;
}

/**
 * The edge below which an icon is too coarse for the size it is shown at.
 *
 * The row of icons draws at 20 pixels, so 64 covers a dense display twice over.
 */
const PREFERRED_EDGE = 64;

/**
 * The icon addresses a page names in its head, best first.
 *
 * Best is the smallest icon that is still at least `PREFERRED_EDGE` across,
 * because the icon travels inside the page and a 512 pixel mark shown at 20 is
 * paid for on every render. Where a site declares nothing that large, the
 * largest it does declare comes first instead, and a link without `sizes` sorts
 * last rather than being dropped, since plenty of sites give none and their one
 * icon is the only one there is.
 *
 * @param homepage - The site's origin.
 * @returns Absolute addresses, in the order they should be tried.
 */
async function declaredIconUrls(homepage: string): Promise<string[]> {
  const result = await fetchExternalResource(`${homepage}/`, {
    signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS),
    headers: HEADERS,
  });
  if (!result?.response.ok) return [];

  let html: string;
  try {
    html = (await result.response.text()).slice(0, MAX_HTML_BYTES);
  } catch {
    return [];
  }

  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const icons: { url: string; size: number }[] = [];

  for (const link of links) {
    const rel = attribute(link, "rel");
    if (!rel || !/(^|\s)(shortcut\s+)?icon(\s|$)|apple-touch-icon/i.test(rel)) continue;

    const href = attribute(link, "href");
    if (!href) continue;

    let absolute: string;
    try {
      absolute = new URL(href, `${homepage}/`).toString();
    } catch {
      continue;
    }

    icons.push({ url: absolute, size: largestDeclaredSize(attribute(link, "sizes")) });
  }

  return icons.sort(byFitness).map((icon) => icon.url);
}

/**
 * Orders two declared icons by how well they suit the size they are shown at.
 *
 * Anything at least `PREFERRED_EDGE` across is good enough, and among those the
 * smaller one wins because it costs less. Everything below that sorts after
 * them, largest first, so a site declaring only small icons still offers its
 * best one.
 */
function byFitness(left: { size: number }, right: { size: number }): number {
  const leftFits = left.size >= PREFERRED_EDGE;
  const rightFits = right.size >= PREFERRED_EDGE;
  if (leftFits && rightFits) return left.size - right.size;
  if (leftFits !== rightFits) return leftFits ? -1 : 1;
  return right.size - left.size;
}

/**
 * Reads one attribute out of a tag.
 *
 * @param tag - The whole tag, as it stands in the markup.
 * @param name - The attribute being asked for.
 * @returns Its value, or `null` when the tag does not carry it.
 */
function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() ?? null;
}

/**
 * The largest edge a `sizes` attribute declares.
 *
 * @param sizes - The attribute's value, such as `32x32 16x16`, or `null`.
 * @returns The largest edge in pixels, or `0` when nothing was declared.
 */
function largestDeclaredSize(sizes: string | null): number {
  if (!sizes) return 0;
  const edges = [...sizes.matchAll(/(\d+)\s*[x×]\s*(\d+)/gi)].map((match) => Number(match[1]));
  return edges.length > 0 ? Math.max(...edges) : 0;
}

/**
 * Fetches one icon and turns it into a `data:` URL.
 *
 * @param url - The icon's address.
 * @returns The `data:` URL, or `null` when the address answers with something
 *   that is not a readable image, or with one too large to carry in a page.
 */
async function fetchAsDataUrl(url: string): Promise<string | null> {
  const result = await fetchExternalResource(url, {
    signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS),
    headers: { ...HEADERS, Accept: "image/*" },
  });
  if (!result?.response.ok) return null;

  const type = (result.response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  if (!ALLOWED_TYPES.has(type.toLowerCase())) return null;

  const declaredLength = Number(result.response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_ICON_BYTES) return null;

  try {
    const bytes = new Uint8Array(await result.response.arrayBuffer());
    // Checked again after reading, because the header is the site's claim about
    // the size whilst this is the size.
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_ICON_BYTES) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch (err) {
    logger.warn({ err, url }, "favicon could not be read");
    return null;
  }
}
