/**
 * Backfill script: fetches a preview image for shops that don't have one yet.
 * Strategy per shop:
 *   1. og:image / twitter:image from HTML
 *   2. First large <img> on the page
 *   3. apple-touch-icon link from HTML
 *   4. /apple-touch-icon.png at root (direct path)
 *   5. Google Favicon Service (sz=128) – always works as last resort
 *
 * Run with: bun run src/scripts/fetch-og-images.ts
 */

import { eq, isNull, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { shops } from "../db/schema.js";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

const SKIP_PATTERNS = /icon|logo|sprite|pixel|tracking|badge|flag|avatar|1x1|blank/i;
const SKIP_EXT = /\.(svg|gif|ico)(\?|$)/i;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function extractHomepage(url: string): string {
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

function extractOgImage(html: string, base: string): string | null {
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return resolveUrl(ogMatch[1].trim(), base);

  const twMatch =
    html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);
  if (twMatch?.[1]) return resolveUrl(twMatch[1].trim(), base);

  return null;
}

function extractAppleTouchIcon(html: string, base: string): string | null {
  const match =
    html.match(/<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon(?:-precomposed)?["']/i);
  if (match?.[1]) return resolveUrl(match[1].trim(), base);
  return null;
}

function firstLargeImage(html: string, base: string): string | null {
  for (const [, attrs] of html.matchAll(/<img\b([^>]+)>/gi)) {
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (SKIP_PATTERNS.test(src) || SKIP_EXT.test(src)) continue;

    const wMatch = attrs.match(/\bwidth=["']?(\d+)/i);
    if (wMatch && Number(wMatch[1]) < 200) continue;

    const resolved = resolveUrl(src, base);
    if (resolved) return resolved;
  }
  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function tryImageUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": HEADERS["User-Agent"] },
      redirect: "follow",
    });
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) return url;
    return null;
  } catch {
    return null;
  }
}

function googleFaviconUrl(shopUrl: string): string {
  const domain = extractDomain(shopUrl);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

async function fetchPreviewImage(shopUrl: string): Promise<{ url: string; via: string } | null> {
  const homepage = extractHomepage(shopUrl);
  const urlsToTry = shopUrl !== homepage + "/" && shopUrl !== homepage
    ? [shopUrl, homepage + "/"]
    : [shopUrl];

  // Pass 1: try HTML-based extraction on each URL
  for (const url of urlsToTry) {
    const html = await fetchHtml(url);
    if (!html) continue;

    const og = extractOgImage(html, url);
    if (og) return { url: og, via: "og:image" };

    const large = firstLargeImage(html, url);
    if (large) return { url: large, via: "img" };

    const apple = extractAppleTouchIcon(html, url);
    if (apple) return { url: apple, via: "apple-icon" };
  }

  // Pass 2: try /apple-touch-icon.png directly (bypasses Cloudflare for static assets)
  for (const suffix of ["/apple-touch-icon.png", "/apple-touch-icon-precomposed.png"]) {
    const result = await tryImageUrl(homepage + suffix);
    if (result) return { url: result, via: "apple-icon-path" };
  }

  // Pass 3: Google Favicon Service – reliable for virtually every domain
  const favicon = googleFaviconUrl(shopUrl);
  const faviconResult = await tryImageUrl(favicon);
  if (faviconResult) return { url: favicon, via: "favicon" };

  return null;
}

const pending = await db
  .select({ id: shops.id, name: shops.name, url: shops.url })
  .from(shops)
  .where(or(isNull(shops.ogImage), eq(shops.ogImage, "")));

console.log(`Fetching preview image for ${pending.length} shops…\n`);

const counts: Record<string, number> = {};
let failed = 0;

for (const shop of pending) {
  const result = await fetchPreviewImage(shop.url);
  await db
    .update(shops)
    .set({ ogImage: result?.url ?? "" })
    .where(eq(shops.id, shop.id));

  if (result) {
    counts[result.via] = (counts[result.via] ?? 0) + 1;
    console.log(`  ✓ ${shop.name} (${result.via})`);
  } else {
    console.log(`  ✗ ${shop.name}`);
    failed++;
  }

  await new Promise((resolve) => setTimeout(resolve, 300));
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`\nDone. ${total} found, ${failed} not found.`);
for (const [via, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${via}: ${count}`);
}
