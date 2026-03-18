import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import { MAX_DISCOVERED_LINKS, MAX_PAGES } from "../constants";
import { crawl4aiPage, crawl4aiPages, describeCrawl4AIResult, extractMarkdown, type Crawl4AILink, type Crawl4AIResult } from "./crawl4ai";

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

/** Classify a URL into a page category, or null if unrecognized. */
function classifyUrl(url: string): PageCategory | null {
  const lower = url.toLowerCase();
  for (const cat of PAGE_CATEGORIES) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) return cat;
  }
  return null;
}

/** Extract same-host links from Crawl4AI's pre-parsed internal links list.
 *  Handles both absolute and relative hrefs by resolving against the base origin. */
function internalLinksFromCrawl4AI(baseUrl: URL, links: Crawl4AILink[]): string[] {
  const result: string[] = [];
  for (const link of links) {
    try {
      const url = new URL(link.href, baseUrl.origin);
      if (url.hostname !== baseUrl.hostname) continue;
      url.hash = "";
      url.search = "";
      const normalized = url.toString().replace(/\/+$/, "") || url.toString();
      result.push(normalized);
    } catch {
      // ignore invalid URLs
    }
  }
  return [...new Set(result)];
}

/** Convert a Crawl4AI result to FetchedPage, preferring Crawl4AI markdown for text. */
function crawl4aiResultToPage(result: Crawl4AIResult): FetchedPage {
  const markdown = extractMarkdown(result);
  const text = markdown.length > 100 ? markdown : extractMainContent(result.html);
  return {
    url: result.url,
    status: result.status_code ?? 200,
    html: result.html,
    text,
  };
}

async function fetchPagesBatch(
  urls: string[],
  onProgress?: (msg: string) => void,
): Promise<FetchedPage[]> {
  if (urls.length === 0) return [];
  const results = await crawl4aiPages(urls);
  const pages: FetchedPage[] = [];
  for (const r of results) {
    onProgress?.(`  Crawl4AI ${r.url}: ${describeCrawl4AIResult(r)}`);
    if (r.success && r.html) pages.push(crawl4aiResultToPage(r));
  }
  return pages;
}

export async function crawlRelevantPages({
  shopUrl,
  onProgress,
}: {
  shopUrl: string;
  userAgent?: string;
  onProgress?: (message: string) => void;
}): Promise<FetchedPage[]> {
  const host = new URL(shopUrl);
  const rootUrl = host.toString().replace(/\/+$/, "");
  const seen = new Set<string>();
  const pages: FetchedPage[] = [];

  // --- Phase 1: Fetch homepage via Crawl4AI ---
  onProgress?.(`Phase 1: Fetching homepage via Crawl4AI... ${rootUrl}`);
  const homepageResult = await crawl4aiPage(rootUrl);
  if (!homepageResult) {
    onProgress?.("Homepage unreachable: Crawl4AI request timed out or returned no result.");
    return [];
  }
  onProgress?.(`Homepage crawl result: ${describeCrawl4AIResult(homepageResult)}`);
  if (!homepageResult.success || !homepageResult.html) {
    onProgress?.("Homepage unreachable: crawl failed, aborting.");
    return [];
  }
  const homepage = crawl4aiResultToPage(homepageResult);
  pages.push(homepage);
  seen.add(rootUrl);

  // --- Phase 2: Discover & classify links from homepage ---
  const rawInternalLinks = homepageResult.links?.internal ?? [];
  onProgress?.(`Phase 2: Crawl4AI returned ${rawInternalLinks.length} internal links from homepage.`);
  const internalLinks = internalLinksFromCrawl4AI(host, rawInternalLinks);
  const categorizedUrls = new Map<PageCategory, string[]>();
  const uncategorized: string[] = [];

  for (const link of internalLinks) {
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
    for (const path of STATIC_FALLBACKS[cat]) {
      const url = new URL(path, host).toString().replace(/\/+$/, "");
      if (!seen.has(url) && !targetUrls.includes(url)) {
        fallbackUrls.push(url);
        break;
      }
    }
  }

  if (missingCategories.length > 0) {
    onProgress?.(`Phase 3: Trying ${fallbackUrls.length} static fallback(s) for: ${missingCategories.join(", ")}.`);
  }

  // --- Phase 4: Batch-fetch all target URLs via Crawl4AI ---
  const allTargets = [...new Set([...targetUrls, ...fallbackUrls].filter((url) => !seen.has(url)))].slice(0, MAX_DISCOVERED_LINKS);
  onProgress?.(`Phase 4: Batch-fetching ${allTargets.length} targeted pages via Crawl4AI...`);
  const fetched = await fetchPagesBatch(allTargets, onProgress);
  onProgress?.(`Phase 4 result: ${fetched.length}/${allTargets.length} pages returned content.`);
  for (const page of fetched) {
    if (pages.length >= MAX_PAGES) break;
    seen.add(page.url);
    pages.push(page);
    onProgress?.(`  [${pages.length}] ${page.url} (${page.text.length}b text)`);
  }

  // --- Phase 5: If critical categories still missing, try more static fallbacks ---
  const fetchedUrls = new Set(pages.map((p) => p.url.toLowerCase()));
  const stillMissing = missingCategories.filter((cat) => {
    const keywords = CATEGORY_KEYWORDS[cat];
    return ![...fetchedUrls].some((url) => keywords.some((kw) => url.includes(kw)));
  });

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
      const extraPages = await fetchPagesBatch(batch, onProgress);
      for (const page of extraPages) {
        if (pages.length >= MAX_PAGES) break;
        pages.push(page);
      }
    }
  }

  // --- Phase 6: Fill remaining slots with uncategorized links ---
  if (pages.length < MAX_PAGES && uncategorized.length > 0) {
    const remaining = Math.min(MAX_PAGES - pages.length, 5);
    const extras = uncategorized.filter((url) => !seen.has(url)).slice(0, remaining);
    if (extras.length > 0) {
      onProgress?.(`Phase 6: Fetching ${extras.length} additional uncategorized pages...`);
      const extraPages = await fetchPagesBatch(extras, onProgress);
      for (const page of extraPages) {
        if (pages.length >= MAX_PAGES) break;
        pages.push(page);
      }
    }
  }

  onProgress?.(`Crawl complete: ${pages.length} pages fetched.`);
  return pages;
}
