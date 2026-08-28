import {
  readBodyWithLimit,
  readJsonWithLimit,
  readTextPrefix,
} from "./http-body.js";
import { logger } from "./logger.js";
import { isPublicFetchTarget } from "./validate.js";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

const SKIP_EXT = /\.(svg|gif|ico)(\?|$)/i;
const SKIP_NAME_PATTERNS = /pixel|tracking|1x1|blank|spacer/i;
const MAX_REDIRECTS = 3;
const PROBE_TIMEOUT_MS = 4000;
const HTML_TIMEOUT_MS = 10000;
const MANIFEST_TIMEOUT_MS = 5000;
const MAX_INLINE_IMG_CANDIDATES = 12;

// Byte budgets for bodies fetched from sites we do not control. A timeout alone
// does not bound memory, because a fast server sends a great deal within it.
/** Enough for the `<head>` of any real shop page, which is all that is parsed. */
const MAX_HTML_BYTES = 512 * 1024;
/** Twice what the `Range` header asks for, since a server may ignore it. */
const MAX_IMAGE_PROBE_BYTES = 64 * 1024;
/** A web app manifest is a small JSON document. */
const MAX_MANIFEST_BYTES = 256 * 1024;

const LOGO_NAME_PATTERN = /(^|[^a-z])(logo|brand|wordmark|signet)([^a-z]|$)/i;
const THEME_ASSET_PATH_PATTERN = /\/(theme|themes|template|templates|skin|skins|assets|static)\//i;

type CandidateKind = "apple-touch" | "og" | "manifest" | "icon" | "inline-logo" | "inline-other";

/**
 * What a caller is looking for on the page.
 *
 * `site-mark` is a site's own mark, which is what a shop needs. `portrait` is
 * the picture a page shows of a person, which is what a sponsor's profile
 * carries. The two want opposite things from the same page, so the question is
 * asked once here rather than as a handful of flags at each call site.
 */
export type PreviewIntent = "site-mark" | "portrait";

/**
 * The order a site's own mark is looked for in.
 *
 * A touch icon comes first because it is the mark a site cuts for exactly this
 * purpose, whilst its `og:image` is usually a banner.
 */
const SITE_MARK_PRIORITY: CandidateKind[] = [
  "apple-touch",
  "og",
  "manifest",
  "icon",
  "inline-logo",
  "inline-other",
];

/**
 * The order a person's picture is looked for in.
 *
 * The other way round, because on a profile the `og:image` is the portrait and
 * the touch icon belongs to the service rather than to the person. Looking for
 * a mark on a profile returns the platform's logo, which is the one picture
 * nobody wants there.
 */
const PORTRAIT_PRIORITY: CandidateKind[] = [
  "og",
  "apple-touch",
  "manifest",
  "icon",
  "inline-logo",
  "inline-other",
];

const MIN_DIMENSION_BY_KIND: Record<CandidateKind, number> = {
  "apple-touch": 96,
  og: 128,
  manifest: 96,
  icon: 96,
  "inline-logo": 64,
  "inline-other": 128,
};

/**
 * Detects whether a URL looks like a logo asset rather than a content image.
 *
 * @param url - Absolute or relative image URL.
 * @returns `true` when the URL contains a logo-style keyword in path/query or
 *          sits under a typical theme-asset directory.
 *
 * @remarks
 * Used to upgrade plain inline `<img>` candidates to a higher priority group.
 * The heuristic intentionally accepts theme-asset paths because shop systems
 * (Shopware, Shopify, WordPress) keep their brand logo under `/theme/`,
 * `/assets/`, `/static/` etc., while hero/content images live under
 * `/media/`, `/uploads/`, `/cdn/`.
 */
export function isLogoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (LOGO_NAME_PATTERN.test(u.pathname + u.search)) return true;
    if (THEME_ASSET_PATH_PATTERN.test(u.pathname)) return true;
    return false;
  } catch {
    if (LOGO_NAME_PATTERN.test(url)) return true;
    if (THEME_ASSET_PATH_PATTERN.test(url)) return true;
    return false;
  }
}

/**
 * Resolves homepage origin from an arbitrary URL.
 *
 * @param url - Any absolute URL.
 * @returns URL origin (`protocol//host`) or original input when parsing fails.
 */
export function extractHomepage(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

function resolveUrl(src: string, base: string): string | null {
  if (!src || src.startsWith("data:")) return null;
  try {
    return src.startsWith("http") ? src : new URL(src, base).toString();
  } catch {
    return null;
  }
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function resolveRedirectUrl(location: string, currentUrl: string): string | null {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Fetches an external resource while validating each redirect hop.
 *
 * Redirects are resolved manually so a public URL cannot bounce the backend
 * into private/internal targets.
 */
export async function fetchExternalResource(
  url: string,
  init: RequestInit,
): Promise<{ response: Response; finalUrl: string } | null> {
  if (!(await isPublicFetchTarget(url))) return null;

  try {
    return fetchExternalResourceHop(url, init, MAX_REDIRECTS, url);
  } catch (err) {
    logger.error({ err }, "external resource fetch failed");
    return null;
  }
}

async function fetchExternalResourceHop(
  currentUrl: string,
  init: RequestInit,
  remainingRedirects: number,
  originalUrl: string,
): Promise<{ response: Response; finalUrl: string } | null> {
  const response = await fetch(currentUrl, { ...init, redirect: "manual" });

  if (!isRedirectStatus(response.status)) {
    return { response, finalUrl: currentUrl };
  }

  if (remainingRedirects <= 0) {
    logger.warn(
      { url: originalUrl, maxRedirects: MAX_REDIRECTS },
      "too many redirects while resolving external resource",
    );
    return null;
  }

  const location = response.headers.get("location");
  const nextUrl = location ? resolveRedirectUrl(location, currentUrl) : null;

  if (!nextUrl || !(await isPublicFetchTarget(nextUrl))) {
    logger.warn({ currentUrl, location }, "blocked redirect while resolving external resource");
    return null;
  }

  return fetchExternalResourceHop(nextUrl, init, remainingRedirects - 1, originalUrl);
}

async function fetchHtml(url: string): Promise<string | null> {
  const result = await fetchExternalResource(url, {
    signal: AbortSignal.timeout(HTML_TIMEOUT_MS),
    headers: HEADERS,
  });
  if (!result?.response.ok) return null;

  // The prefix rather than the whole document, because this HTML is scanned for
  // tags and never parsed as a unit. Everything the scan wants sits in the
  // head, so a storefront a few kilobytes over budget still answers, whereas
  // discarding it answered nothing at all. bestware.com is 540 KB against a
  // 512 KB budget and lost its logo to exactly that.
  const html = await readTextPrefix(result.response, MAX_HTML_BYTES);
  if (html.length === 0) {
    logger.warn({ url }, "external HTML was empty");
    return null;
  }
  return html;
}

/**
 * The software names NodeInfo reports, against the platform key they mean.
 *
 * Only names that have been seen answering are in here. A host running
 * something else is left alone rather than guessed at.
 */
const SOFTWARE_TO_PLATFORM: Readonly<Record<string, string>> = {
  pixelfed: "pixelfed",
  mastodon: "mastodon",
  friendica: "friendica",
};

/** How long the two NodeInfo requests may take, each. */
const NODEINFO_TIMEOUT_MS = 6000;

/** NodeInfo documents are small; anything larger is not one. */
const MAX_NODEINFO_BYTES = 64 * 1024;

/**
 * Asks a host which software it runs, through NodeInfo.
 *
 * A service anybody can host sits on a domain of its own and its profiles are a
 * single path segment, which is what a personal website looks like too, so the
 * address cannot say what it is. Its own pages cannot be trusted to either:
 * measured across twelve Pixelfed instances on 2026-08-24, their landing pages
 * carried no `generator` at all and their `og:site_name` was whatever the
 * operator had named the place, from "Pixey" to "FediSnap".
 *
 * NodeInfo is the fediverse's own answer to this question. All twelve reported
 * `pixelfed` with a version, and it is the same query for Mastodon or anything
 * else that speaks it.
 *
 * Two requests: the well-known document lists where the real one lives, and the
 * real one carries the software name.
 *
 * @param address - Any address on the host in question.
 * @returns The platform key, or `null` when the host speaks no NodeInfo or runs
 *   something not mapped here.
 */
export async function detectPlatformFromHost(address: string): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(address).origin;
  } catch {
    return null;
  }

  const index = await fetchNodeinfoJson<{ links?: unknown }>(`${origin}/.well-known/nodeinfo`);
  if (!index || !Array.isArray(index.links)) return null;

  // The last link is the newest schema the host offers, which is the one to ask.
  const hrefs = index.links
    .map((link) =>
      link && typeof link === "object" ? (link as Record<string, unknown>).href : undefined,
    )
    .filter((href): href is string => typeof href === "string");
  const href = hrefs.at(-1);
  if (!href) return null;

  const document = await fetchNodeinfoJson<{ software?: unknown }>(href);
  const software = document?.software;
  const name =
    software && typeof software === "object"
      ? (software as Record<string, unknown>).name
      : undefined;
  if (typeof name !== "string") return null;

  return SOFTWARE_TO_PLATFORM[name.trim().toLowerCase()] ?? null;
}

/**
 * Reads one NodeInfo document.
 *
 * @param url - The document's address.
 * @returns The parsed body, or `null` on any failure.
 */
async function fetchNodeinfoJson<T>(url: string): Promise<T | null> {
  const result = await fetchExternalResource(url, {
    signal: AbortSignal.timeout(NODEINFO_TIMEOUT_MS),
    headers: { "User-Agent": HEADERS["User-Agent"], Accept: "application/json" },
  });
  if (!result?.response.ok) return null;
  try {
    return await readJsonWithLimit<T>(result.response, MAX_NODEINFO_BYTES);
  } catch (err) {
    logger.warn({ err, url }, "nodeinfo lookup failed");
    return null;
  }
}

// === Image header probe ===
// Parses the native header bytes of common web image formats and returns the
// real pixel dimensions. Designed to work on the first ~32 KB of a file.

/**
 * Parses image dimensions from the header bytes of PNG, JPEG, GIF and WebP files.
 *
 * @param buf - Raw bytes of an image. The first few KB are sufficient for all supported formats.
 * @returns `{ width, height }` in pixels, or `null` when the format is unrecognised or malformed.
 */
export function parseImageDimensions(buf: Uint8Array): { width: number; height: number } | null {
  // PNG: 8-byte signature, then 4-byte chunk length, "IHDR", 4-byte width, 4-byte height (big-endian)
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  // JPEG: SOI (FFD8), then walk segments until a SOFn marker (FFC0..FFCF, except DHT/JPG/DAC)
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) return null;
      let marker = buf[off + 1];
      // Skip fill bytes
      while (marker === 0xff && off + 2 < buf.length) {
        off++;
        marker = buf[off + 1];
      }
      // Standalone markers without length payload
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        off += 2;
        continue;
      }
      // SOF markers (frame headers) carry width + height. Skip DHT (C4), JPG (C8), DAC (CC).
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        if (off + 9 >= buf.length) return null;
        const view = new DataView(buf.buffer, buf.byteOffset + off + 5, 4);
        return { height: view.getUint16(0), width: view.getUint16(2) };
      }
      // Other segments: 2-byte length follows marker
      if (off + 3 >= buf.length) return null;
      const segLen = (buf[off + 2] << 8) | buf[off + 3];
      if (segLen < 2) return null;
      off += 2 + segLen;
    }
    return null;
  }

  // GIF87a / GIF89a: width and height as little-endian 16-bit at offsets 6, 8
  if (
    buf.length >= 10 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return {
      width: buf[6] | (buf[7] << 8),
      height: buf[8] | (buf[9] << 8),
    };
  }

  // WebP: "RIFF" .... "WEBP" then one of "VP8 ", "VP8L", "VP8X"
  if (
    buf.length >= 30 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    const fourcc = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);

    if (fourcc === "VP8 ") {
      // Lossy: 3-byte frame tag + sync code 9d 01 2a + width(14) + height(14), little-endian
      if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
      const w = (buf[26] | (buf[27] << 8)) & 0x3fff;
      const h = (buf[28] | (buf[29] << 8)) & 0x3fff;
      return { width: w, height: h };
    }

    if (fourcc === "VP8L") {
      // Lossless: signature byte 0x2f at offset 20, then 14-bit width-1, 14-bit height-1
      if (buf[20] !== 0x2f) return null;
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      const w = (((b1 & 0x3f) << 8) | b0) + 1;
      const h = (((b3 & 0x0f) << 10) | (b2 << 2) | (b1 >> 6)) + 1;
      return { width: w, height: h };
    }

    if (fourcc === "VP8X") {
      // Extended: 24-bit canvas width-1 at offset 24, height-1 at offset 27 (all little-endian)
      const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
      const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
      return { width: w, height: h };
    }

    return null;
  }

  return null;
}

/**
 * Downloads enough of an image to read its native header and returns the real
 * pixel dimensions plus the final resolved URL.
 *
 * @param url - Absolute image URL.
 * @returns `{ url, width, height }` when the image was reached and decoded, otherwise `null`.
 *
 * @remarks
 * Asks for `Range: bytes=0-32767` to keep the transfer small. A server may
 * ignore that and send the whole file, so the read is additionally capped at
 * {@link MAX_IMAGE_PROBE_BYTES} and the candidate is dropped once the body
 * passes it. The header bytes needed to size an image sit far below that.
 */
async function probeImage(
  url: string,
): Promise<{ url: string; width: number; height: number } | null> {
  if (SKIP_EXT.test(url)) return null;
  if (SKIP_NAME_PATTERNS.test(url)) return null;

  const result = await fetchExternalResource(url, {
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    headers: {
      "User-Agent": HEADERS["User-Agent"],
      Accept: "image/*",
      Range: "bytes=0-32767",
    },
  });
  if (!result) return null;

  const status = result.response.status;
  if (status !== 200 && status !== 206) return null;

  const ct = result.response.headers.get("content-type")?.toLowerCase() ?? "";
  if (ct && !ct.startsWith("image/")) return null;

  try {
    const buf = await readBodyWithLimit(result.response, MAX_IMAGE_PROBE_BYTES);
    if (buf === null) {
      logger.warn({ url, maxBytes: MAX_IMAGE_PROBE_BYTES }, "image probe exceeded size budget");
      return null;
    }
    const dims = parseImageDimensions(buf);
    if (!dims || dims.width <= 0 || dims.height <= 0) return null;
    return { url: result.finalUrl, ...dims };
  } catch (err) {
    logger.warn({ err, url }, "image probe failed");
    return null;
  }
}

// === Candidate collection ===
// All sources are collected up front, then probed. The naming and `sizes`
// attributes on `<link>` tags are NOT used as ranking input — sites often
// declare large sizes for tiny PNGs, so only the real header dimensions count.

type Candidate = { url: string; kind: CandidateKind; via: string };

/**
 * Query keys through which a CDN is asked for a particular size.
 *
 * Only unambiguous ones. A version or cache-busting key is deliberately absent,
 * because dropping it can change what the CDN serves rather than only how large
 * it serves it.
 */
const SIZE_QUERY_KEYS = new Set([
  "crop",
  "fit",
  "h",
  "height",
  "max-h",
  "max-w",
  "maxheight",
  "maxwidth",
  "resize",
  "s",
  "size",
  "sz",
  "w",
  "width",
]);

/**
 * The same image without the size its page asked for.
 *
 * A page routinely declares a large logo at icon size, because that is what the
 * page itself needs. The probe then measures the thumbnail, finds it under the
 * minimum for its kind, and discards a picture that was never too small. Asking
 * the same URL without those parameters returns the original.
 *
 * @param url - The URL as the page declared it.
 * @returns The URL without sizing parameters, or `null` where there were none
 *   to remove or the URL cannot be parsed. `null` means the caller has nothing
 *   new to enqueue.
 */
export function withoutSizeConstraints(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let removed = false;
  for (const key of [...parsed.searchParams.keys()]) {
    if (!SIZE_QUERY_KEYS.has(key.toLowerCase())) continue;
    parsed.searchParams.delete(key);
    removed = true;
  }
  if (!removed) return null;

  // `URL` keeps a bare "?" once every parameter is gone, and that string is not
  // the same URL for the `seen` set or for a cache in front of it.
  return parsed.searchParams.size === 0
    ? `${parsed.origin}${parsed.pathname}${parsed.hash}`
    : parsed.toString();
}

function pushCandidate(
  out: Candidate[],
  seen: Set<string>,
  url: string | null,
  kind: CandidateKind,
  via: string,
): void {
  if (!url) return;
  if (seen.has(url)) return;
  if (SKIP_EXT.test(url)) return;
  seen.add(url);
  out.push({ url, kind, via });

  // Every source converges here, so one line covers link icons, manifests,
  // meta tags and inline images alike. The stripped variant is probed like any
  // other candidate; where it does not exist it fails that probe and costs a
  // single request.
  const full = withoutSizeConstraints(url);
  if (full && !seen.has(full) && !SKIP_EXT.test(full)) {
    seen.add(full);
    out.push({ url: full, kind, via: `${via}-full` });
  }
}

function collectMetaImage(
  html: string,
  base: string,
  property: string,
  attr: "property" | "name",
  kind: CandidateKind,
  via: string,
  out: Candidate[],
  seen: Set<string>,
): void {
  const propPattern = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\b[^>]*${attr}=["']${propPattern}["'][^>]*content=["']([^"']+)["']`, "gi"),
    new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${propPattern}["']`, "gi"),
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      pushCandidate(out, seen, resolveUrl(match[1].trim(), base), kind, via);
    }
  }
}

function collectLinkIcons(html: string, base: string, out: Candidate[], seen: Set<string>): void {
  for (const [, attrs] of html.matchAll(/<link\b([^>]+)>/gi)) {
    const relMatch = attrs.match(/\brel=["']([^"']+)["']/i);
    if (!relMatch) continue;
    const rel = relMatch[1].toLowerCase();
    let kind: CandidateKind | null = null;
    let via: string | null = null;
    if (/\bapple-touch-icon(?:-precomposed)?\b/.test(rel)) {
      kind = "apple-touch";
      via = "apple-icon";
    } else if (/\b(?:shortcut\s+)?icon\b/.test(rel)) {
      kind = "icon";
      via = "icon";
    } else if (/\bfluid-icon\b/.test(rel)) {
      kind = "icon";
      via = "fluid-icon";
    } else if (/\bimage_src\b/.test(rel)) {
      kind = "og";
      via = "image_src";
    }
    if (!kind || !via) continue;

    const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    pushCandidate(out, seen, resolveUrl(hrefMatch[1].trim(), base), kind, via);
  }
}

function collectJsonLdImages(
  data: unknown,
  base: string,
  out: Candidate[],
  seen: Set<string>,
): void {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) collectJsonLdImages(item, base, out, seen);
    return;
  }
  if (typeof data !== "object") return;

  const obj = data as Record<string, unknown>;
  const img = obj.image;
  if (typeof img === "string") {
    pushCandidate(out, seen, resolveUrl(img, base), "og", "json-ld");
  } else if (Array.isArray(img)) {
    for (const entry of img) {
      if (typeof entry === "string") {
        pushCandidate(out, seen, resolveUrl(entry, base), "og", "json-ld");
      } else if (entry && typeof entry === "object") {
        const entryUrl = (entry as Record<string, unknown>).url;
        if (typeof entryUrl === "string") {
          pushCandidate(out, seen, resolveUrl(entryUrl, base), "og", "json-ld");
        }
      }
    }
  } else if (img && typeof img === "object") {
    const imgUrl = (img as Record<string, unknown>).url;
    if (typeof imgUrl === "string") {
      pushCandidate(out, seen, resolveUrl(imgUrl, base), "og", "json-ld");
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      collectJsonLdImages(value, base, out, seen);
    }
  }
}

function collectJsonLdBlocks(
  html: string,
  base: string,
  out: Candidate[],
  seen: Set<string>,
): void {
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      collectJsonLdImages(JSON.parse(match[1].trim()), base, out, seen);
    } catch {
      // Malformed JSON-LD blocks are common; skip silently
    }
  }
}

function collectInlineImages(
  html: string,
  base: string,
  out: Candidate[],
  seen: Set<string>,
): void {
  let added = 0;
  for (const [, attrs] of html.matchAll(/<img\b([^>]+)>/gi)) {
    if (added >= MAX_INLINE_IMG_CANDIDATES) break;
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (SKIP_NAME_PATTERNS.test(src) || SKIP_EXT.test(src)) continue;
    const resolved = resolveUrl(src, base);
    if (!resolved) continue;
    const kind: CandidateKind = isLogoUrl(resolved) ? "inline-logo" : "inline-other";
    pushCandidate(out, seen, resolved, kind, kind === "inline-logo" ? "inline-logo" : "inline-img");
    added++;
  }
}

async function fetchManifestIcons(manifestUrl: string, base: string): Promise<string[]> {
  const result = await fetchExternalResource(manifestUrl, {
    signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    headers: { "User-Agent": HEADERS["User-Agent"], Accept: "application/json,*/*" },
  });
  if (!result?.response.ok) return [];
  try {
    const json = await readJsonWithLimit<{ icons?: unknown }>(result.response, MAX_MANIFEST_BYTES);
    if (!json) return [];
    if (!Array.isArray(json.icons)) return [];
    const out: string[] = [];
    for (const icon of json.icons) {
      if (icon && typeof icon === "object") {
        const src = (icon as Record<string, unknown>).src;
        if (typeof src === "string") {
          const resolved = resolveUrl(src, base);
          if (resolved) out.push(resolved);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function extractManifestHref(html: string, base: string): string | null {
  const match =
    html.match(/<link\b[^>]*rel=["']manifest["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']manifest["']/i);
  if (!match) return null;
  return resolveUrl(match[1].trim(), base);
}

/**
 * Resolves the best preview image available for a shop.
 *
 * @param shopUrl - Shop URL provided by user or database.
 * @returns `{ url, via }` of the best candidate, or `null` when no candidate
 *          reaches the minimum dimension threshold.
 *
 * @remarks
 * All candidates from meta tags, link tags, JSON-LD, the web app manifest,
 * well-known paths, and inline images are collected, then each is fetched and
 * its real header dimensions are read. Candidates are bucketed by source kind
 * and the buckets are evaluated in this priority order:
 *
 * 1. `apple-touch-icon` (intentional, logo quality)
 * 2. OpenGraph / Twitter / `<link rel="image_src">` / JSON-LD `image`
 * 3. Web app manifest icons
 * 4. `<link rel="icon">`
 * 5. Inline `<img>` whose URL signals a logo (filename contains
 *    `logo`/`brand`/`wordmark`/`signet`, or path lives under a theme/asset
 *    directory)
 * 6. Any other inline `<img>`
 *
 * Within each bucket the candidate with the largest real `max(width, height)`
 * wins. Site-declared `sizes` attributes are ignored deliberately because they
 * often misrepresent the actual asset. The logo bucket uses a lower minimum
 * dimension (64 px) than the other buckets (96–128 px) because real shop
 * logos are legitimately smaller than hero banners.
 */
export async function fetchPreviewImage(
  shopUrl: string,
  options: { intent?: PreviewIntent } = {},
): Promise<{ url: string; via: string } | null> {
  const intent = options.intent ?? "site-mark";
  const priority = intent === "portrait" ? PORTRAIT_PRIORITY : SITE_MARK_PRIORITY;
  const homepage = extractHomepage(shopUrl);
  // A shop's own homepage is the right second place to look, because a deep
  // page and the shop share a mark. A profile's is not: the homepage there
  // belongs to the service, and its picture would win on size and show the
  // platform instead of the person.
  const urlsToTry =
    intent === "portrait"
      ? [shopUrl]
      : shopUrl !== `${homepage}/` && shopUrl !== homepage
        ? [shopUrl, `${homepage}/`]
        : [shopUrl];

  const htmlEntries = await Promise.all(
    urlsToTry.map(async (url) => ({ url, html: await fetchHtml(url) })),
  );
  const htmlMap = new Map<string, string>();
  for (const { url, html } of htmlEntries) {
    if (html) htmlMap.set(url, html);
  }

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const [baseUrl, html] of htmlMap) {
    collectMetaImage(html, baseUrl, "og:image", "property", "og", "og:image", candidates, seen);
    collectMetaImage(
      html,
      baseUrl,
      "og:image:secure_url",
      "property",
      "og",
      "og:image",
      candidates,
      seen,
    );
    collectMetaImage(html, baseUrl, "og:image:url", "property", "og", "og:image", candidates, seen);
    collectMetaImage(
      html,
      baseUrl,
      "twitter:image",
      "name",
      "og",
      "twitter:image",
      candidates,
      seen,
    );
    collectMetaImage(
      html,
      baseUrl,
      "twitter:image:src",
      "name",
      "og",
      "twitter:image",
      candidates,
      seen,
    );
    collectLinkIcons(html, baseUrl, candidates, seen);
    collectJsonLdBlocks(html, baseUrl, candidates, seen);
  }

  const manifestIconEntries = await Promise.all(
    Array.from(htmlMap).map(async ([baseUrl, html]) => {
      const manifestUrl = extractManifestHref(html, baseUrl);
      return manifestUrl ? fetchManifestIcons(manifestUrl, manifestUrl) : [];
    }),
  );
  for (const icons of manifestIconEntries) {
    for (const icon of icons) pushCandidate(candidates, seen, icon, "manifest", "manifest");
  }

  // Guessed at the site's root, so they belong to the service rather than to
  // whoever the page is about, and they are left out when a person is wanted.
  if (intent !== "portrait") {
    pushCandidate(
      candidates,
      seen,
      `${homepage}/apple-touch-icon.png`,
      "apple-touch",
      "well-known",
    );
    pushCandidate(
      candidates,
      seen,
      `${homepage}/apple-touch-icon-precomposed.png`,
      "apple-touch",
      "well-known",
    );
    pushCandidate(candidates, seen, `${homepage}/favicon.png`, "icon", "well-known");
  }

  for (const [baseUrl, html] of htmlMap) {
    collectInlineImages(html, baseUrl, candidates, seen);
  }

  if (candidates.length === 0) return null;

  const probed = await Promise.all(
    candidates.map(async (c) => {
      const probe = await probeImage(c.url);
      if (!probe) return null;
      return { ...probe, kind: c.kind, via: c.via, requestedUrl: c.url };
    }),
  );

  const byKind = new Map<CandidateKind, typeof probed>();
  for (const result of probed) {
    if (!result) continue;
    const minDim = MIN_DIMENSION_BY_KIND[result.kind];
    if (Math.max(result.width, result.height) < minDim) continue;
    const bucket = byKind.get(result.kind) ?? [];
    bucket.push(result);
    byKind.set(result.kind, bucket);
  }

  for (const kind of priority) {
    const bucket = byKind.get(kind);
    if (!bucket || bucket.length === 0) continue;
    let largest = bucket[0];
    for (const entry of bucket) {
      if (!entry || !largest) continue;
      if (Math.max(entry.width, entry.height) > Math.max(largest.width, largest.height)) {
        largest = entry;
      }
    }
    if (largest) return { url: largest.requestedUrl, via: largest.via };
  }

  return null;
}
