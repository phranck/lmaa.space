import { setTimeout as sleep } from "node:timers/promises";

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import { CONCURRENT_FETCHES, CRAWL_DELAY_MS, MAX_DISCOVERED_LINKS, MAX_PAGES, TIMEOUT_PAGE_MS } from "../constants";

export type FetchedPage = {
  url: string;
  status: number;
  html: string;
  text: string;
};

/** Page categories we care about, in priority order. */
const PAGE_CATEGORIES = ["legal", "contact", "about", "shipping", "privacy"] as const;
type PageCategory = (typeof PAGE_CATEGORIES)[number];

const CATEGORY_KEYWORDS: Record<PageCategory, string[]> = {
  legal: [
    "impressum", "imprint", "legal", "legal-notice", "recht", "rechtlich", "rechtliches",
    "agb", "allgemeine-geschaeftsbedingungen", "allgemeine-geschäftsbedingungen",
    "terms", "terms-and-conditions", "bedingungen", "widerruf", "return", "returns", "retoure", "refund",
    "hinweis", "hinweise",
  ],
  contact: [
    "kontakt", "contact", "contact-us", "customer-service", "kundendienst",
    "support", "help", "hilfe", "service", "customer-care",
  ],
  about: [
    "about", "about-us", "ueber", "über", "who-we-are", "company",
    "unternehmen", "team", "geschichte", "our-story", "philosophie", "mission",
  ],
  shipping: [
    "shipping", "shipment", "versand", "lieferung", "delivery",
    "versandkosten", "shipping-costs", "versandinformationen", "versandbedingungen", "lieferbedingungen",
  ],
  privacy: ["privacy", "privacy-policy", "datenschutz", "gdpr", "cookie", "cookies", "data-protection", "dsgvo"],
};

/** Static fallback paths per category — tried only if no link was discovered for that category. */
const STATIC_FALLBACKS: Record<PageCategory, string[]> = {
  legal: [
    "/impressum", "/de/impressum", "/imprint", "/legal", "/legal-notice", "/rechtliches",
    "/agb", "/de/agb", "/terms", "/terms-and-conditions", "/widerruf",
  ],
  contact: ["/kontakt", "/de/kontakt", "/contact", "/contact-us", "/customer-service"],
  about: ["/ueber-uns", "/de/ueber-uns", "/about", "/about-us", "/our-story", "/unternehmen", "/company"],
  shipping: ["/versand", "/de/versand", "/shipping", "/shipping-info", "/lieferung", "/delivery"],
  privacy: ["/datenschutz", "/de/datenschutz", "/privacy", "/privacy-policy"],
};

function toTextFallback(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip common boilerplate patterns from extracted text. */
function stripBoilerplate(text: string): string {
  return text
    .replace(/\b(Wir verwenden Cookies|We use cookies|Diese Website verwendet Cookies|Cookie-Einstellungen|Alle akzeptieren|Nur notwendige|Accept all|Reject all)[^.]*\./gi, "")
    .replace(/\b(Melden Sie sich|Jetzt anmelden|Subscribe to|Sign up for)[^.]*Newsletter[^.]*\./gi, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

/** Fix common Readability artifacts where house number and postal code get glued together. */
function fixGluedAddresses(text: string): string {
  return text.replace(/(\d{1,4}[a-zA-Z]?)(\d{5})\s+([A-ZÄÖÜ])/gu, "$1 $2 $3");
}

export function extractMainContent(html: string): string {
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document as unknown as Document, { charThreshold: 0 });
    const article = reader.parse();
    if (article?.textContent) {
      const cleaned = fixGluedAddresses(stripBoilerplate(article.textContent.replace(/\s+/g, " ").trim()));
      if (cleaned.length > 100) return cleaned;
    }
  } catch {
    // Readability failed, use fallback
  }
  return fixGluedAddresses(stripBoilerplate(toTextFallback(html)));
}

function normalizeUrl(baseUrl: URL, href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith("javascript:")) return null;
  try {
    const url = new URL(trimmed, baseUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.hostname !== baseUrl.hostname) return null;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "") || url.toString();
  } catch {
    return null;
  }
}

function extractInternalLinks(baseUrl: URL, html: string): string[] {
  const links: string[] = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null = re.exec(html);
  while (m) {
    const normalized = normalizeUrl(baseUrl, m[1]);
    if (normalized) links.push(normalized);
    m = re.exec(html);
  }
  return [...new Set(links)];
}

/** Classify a URL into a page category, or null if unrecognized. */
function classifyUrl(url: string): PageCategory | null {
  const lower = url.toLowerCase();
  for (const cat of PAGE_CATEGORIES) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) return cat;
  }
  return null;
}

async function fetchPage(url: string, userAgent: string): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_PAGE_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml",
      },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();
    return { url, status: res.status, html, text: extractMainContent(html) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch multiple URLs concurrently with a concurrency limit. */
async function fetchConcurrent(
  urls: string[],
  userAgent: string,
  concurrency: number,
  onFetched?: (url: string, index: number, total: number) => void,
): Promise<FetchedPage[]> {
  const results: FetchedPage[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < urls.length) {
      const i = nextIndex++;
      const url = urls[i];
      onFetched?.(url, i, urls.length);
      const page = await fetchPage(url, userAgent);
      if (page) results.push(page);
      if (i < urls.length - 1) await sleep(CRAWL_DELAY_MS);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function crawlRelevantPages({
  shopUrl,
  userAgent,
  onProgress,
}: {
  shopUrl: string;
  userAgent: string;
  onProgress?: (message: string) => void;
}): Promise<FetchedPage[]> {
  const host = new URL(shopUrl);
  const rootUrl = host.toString().replace(/\/+$/, "");
  const seen = new Set<string>();
  const pages: FetchedPage[] = [];

  // --- Phase 1: Fetch homepage ---
  onProgress?.("Phase 1: Fetching homepage...");
  const homepage = await fetchPage(rootUrl, userAgent);
  if (!homepage) {
    onProgress?.("Homepage unreachable. Aborting crawl.");
    return [];
  }
  pages.push(homepage);
  seen.add(rootUrl);

  // --- Phase 2: Discover & classify links from homepage ---
  const discoveredLinks = extractInternalLinks(host, homepage.html);
  const categorizedUrls = new Map<PageCategory, string[]>();
  const uncategorized: string[] = [];

  for (const link of discoveredLinks) {
    if (seen.has(link)) continue;
    const cat = classifyUrl(link);
    if (cat) {
      const list = categorizedUrls.get(cat) ?? [];
      list.push(link);
      categorizedUrls.set(cat, list);
    } else {
      uncategorized.push(link);
    }
  }

  // Pick best URLs per category (first match, max 2 per category)
  const targetUrls: string[] = [];
  const coveredCategories = new Set<PageCategory>();

  for (const cat of PAGE_CATEGORIES) {
    const urls = categorizedUrls.get(cat);
    if (urls && urls.length > 0) {
      coveredCategories.add(cat);
      targetUrls.push(...urls.slice(0, 2));
    }
  }

  onProgress?.(`Phase 2: Found links for ${coveredCategories.size}/${PAGE_CATEGORIES.length} categories from homepage.`);

  // --- Phase 3: Static fallbacks for missing categories ---
  const missingCategories = PAGE_CATEGORIES.filter((cat) => !coveredCategories.has(cat));
  const fallbackUrls: string[] = [];

  for (const cat of missingCategories) {
    const paths = STATIC_FALLBACKS[cat];
    for (const path of paths) {
      const url = new URL(path, host).toString().replace(/\/+$/, "");
      if (!seen.has(url) && !targetUrls.includes(url)) {
        fallbackUrls.push(url);
        break; // One fallback per missing category is enough to start
      }
    }
  }

  if (missingCategories.length > 0) {
    onProgress?.(`Phase 3: Trying ${fallbackUrls.length} static fallback(s) for: ${missingCategories.join(", ")}.`);
  }

  // --- Phase 4: Fetch all target URLs concurrently ---
  const allTargets = [...targetUrls, ...fallbackUrls].filter((url) => !seen.has(url));
  // Deduplicate
  const uniqueTargets = [...new Set(allTargets)].slice(0, MAX_DISCOVERED_LINKS);

  onProgress?.(`Phase 4: Fetching ${uniqueTargets.length} targeted pages (${CONCURRENT_FETCHES} concurrent)...`);
  let fetchCount = 0;
  const fetched = await fetchConcurrent(uniqueTargets, userAgent, CONCURRENT_FETCHES, (url, _i, total) => {
    fetchCount++;
    onProgress?.(`Fetching [${pages.length + fetchCount}] ${url}`);
  });

  for (const page of fetched) {
    if (pages.length >= MAX_PAGES) break;
    seen.add(page.url);
    pages.push(page);
  }

  // --- Phase 5: If critical categories still missing, try more static fallbacks ---
  const fetchedUrls = new Set(pages.map((p) => p.url.toLowerCase()));
  const stillMissing: PageCategory[] = [];

  for (const cat of missingCategories) {
    const keywords = CATEGORY_KEYWORDS[cat];
    const found = [...fetchedUrls].some((url) => keywords.some((kw) => url.includes(kw)));
    if (!found) stillMissing.push(cat);
  }

  if (stillMissing.length > 0 && pages.length < MAX_PAGES) {
    const extraFallbacks: string[] = [];
    for (const cat of stillMissing) {
      for (const path of STATIC_FALLBACKS[cat]) {
        const url = new URL(path, host).toString().replace(/\/+$/, "");
        if (!seen.has(url)) {
          extraFallbacks.push(url);
          seen.add(url);
        }
      }
    }

    if (extraFallbacks.length > 0) {
      const remaining = MAX_PAGES - pages.length;
      const batch = extraFallbacks.slice(0, remaining);
      onProgress?.(`Phase 5: Trying ${batch.length} additional fallback(s) for: ${stillMissing.join(", ")}.`);
      const extraPages = await fetchConcurrent(batch, userAgent, CONCURRENT_FETCHES);
      for (const page of extraPages) {
        if (pages.length >= MAX_PAGES) break;
        pages.push(page);
      }
    }
  }

  // --- Phase 6: Fill remaining slots with high-value uncategorized links ---
  if (pages.length < MAX_PAGES && uncategorized.length > 0) {
    const remaining = Math.min(MAX_PAGES - pages.length, 5);
    const extras = uncategorized.filter((url) => !seen.has(url)).slice(0, remaining);
    if (extras.length > 0) {
      onProgress?.(`Phase 6: Fetching ${extras.length} additional uncategorized pages...`);
      const extraPages = await fetchConcurrent(extras, userAgent, CONCURRENT_FETCHES);
      for (const page of extraPages) {
        if (pages.length >= MAX_PAGES) break;
        pages.push(page);
      }
    }
  }

  onProgress?.(`Crawl complete: ${pages.length} pages fetched.`);
  return pages;
}
