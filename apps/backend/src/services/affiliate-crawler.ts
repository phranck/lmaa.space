import { logger } from "../lib/logger.js";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 512_000; // 500 KB per page

/** Keywords that indicate affiliate/partner program content. */
const AFFILIATE_KEYWORDS = [
  "affiliate", "partnerprogramm", "partner werden", "partner program",
  "referral", "provision", "commission", "publisher",
  "awin", "tradedoubler", "tradetracker", "adcell", "belboon",
  "webgains", "cj affiliate", "commission junction", "shareasale",
  "impact", "partnerize", "rakuten", "daisycon", "financeads",
  "digistore", "copecart",
];

/** Common subpaths where affiliate info is often found. */
const AFFILIATE_PATHS = [
  "/partner", "/affiliate", "/partnerprogramm", "/partner-werden",
  "/affiliate-programm", "/affiliates", "/publishers",
  "/kooperationen", "/zusammenarbeit", "/partnerprogramm.html",
  "/affiliate.html", "/partner.html", "/info/affiliate",
  "/info/partner", "/pages/affiliate", "/pages/partner",
  "/ueber-uns/partner", "/about/affiliate",
];

/**
 * Known affiliate network tracking domains and their canonical names.
 * If any of these appear in <script src>, <img src>, or <iframe src>,
 * the shop is almost certainly part of that network.
 */
const NETWORK_TRACKING_SIGNATURES: Array<{ pattern: RegExp; network: string }> = [
  { pattern: /awin1\.com|dwin1\.com|zenaps\.com/i, network: "Awin" },
  { pattern: /emjcd\.com|anrdoezrs\.net|ftjcfx\.com|jdoqocy\.com|kqzyfj\.com|tkqlhce\.com|dpbolvw\.net|lduhtrp\.net/i, network: "CJ Affiliate" },
  { pattern: /tradedoubler\.com|clkuk\.tradedoubler/i, network: "Tradedoubler" },
  { pattern: /tc\.tradetracker\.net|tradetracker\.net/i, network: "TradeTracker" },
  { pattern: /ad\.adcell\.com|adcell\.de|t\.adcell/i, network: "Adcell" },
  { pattern: /track\.belboon\.com|belboon\.de/i, network: "Belboon" },
  { pattern: /track\.webgains\.com|webgains\.com/i, network: "Webgains" },
  { pattern: /shareasale\.com/i, network: "ShareASale" },
  { pattern: /impact\.com|impactradius\.com|sjv\.io/i, network: "Impact" },
  { pattern: /partnerize\.com|prf\.hn/i, network: "Partnerize" },
  { pattern: /rakuten\.com|linksynergy\.com/i, network: "Rakuten" },
  { pattern: /daisycon\.io|daisycon\.com/i, network: "Daisycon" },
  { pattern: /financeads\.net/i, network: "FinanceAds" },
  { pattern: /digistore24\.com/i, network: "Digistore24" },
  { pattern: /copecart\.com/i, network: "CopeCar" },
];

interface CrawlResult {
  shopUrl: string;
  reachable: boolean;
  /** Affiliate network detected via tracking scripts/pixels in the HTML. */
  detectedNetworks: string[];
  /** Affiliate-relevant links found on the page (href + link text). */
  affiliateLinks: Array<{ href: string; text: string }>;
  /** Keyword matches found in the page body. */
  keywordMatches: string[];
  /** Content snippets from affiliate subpages (if any were found). */
  subpageSnippets: Array<{ url: string; snippet: string }>;
  /** Affiliate-related URLs found in sitemap.xml. */
  sitemapHits: string[];
  /** Contact email found on the page (if any). */
  contactEmail: string | null;
  /** Meta description of the shop. */
  metaDescription: string | null;
}

/**
 * Fetch a URL and return the HTML body as text.
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel();
        break;
      }
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
  } catch {
    return null;
  }
}

/**
 * Fetch a text resource (sitemap, robots.txt).
 */
async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length > 1_000_000 ? text.slice(0, 1_000_000) : text;
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const regex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    try {
      links.push({ href: new URL(href, baseUrl).href, text });
    } catch {
      // invalid URL
    }
  }
  return links;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta\s[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    ?? html.match(/<meta\s[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']description["']/i);
  return match?.[1]?.trim() ?? null;
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return [...new Set(matches ?? [])];
}

function extractSnippet(text: string, keyword: string, contextChars = 300): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + keyword.length + contextChars);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect affiliate network tracking scripts/pixels in the raw HTML.
 */
function detectTrackingNetworks(html: string): string[] {
  const found = new Set<string>();
  for (const { pattern, network } of NETWORK_TRACKING_SIGNATURES) {
    if (pattern.test(html)) {
      found.add(network);
    }
  }
  return [...found];
}

/**
 * Parse sitemap.xml for affiliate-related URLs.
 */
async function checkSitemap(baseUrl: string): Promise<string[]> {
  const sitemapUrl = `${baseUrl.replace(/\/$/, "")}/sitemap.xml`;
  const xml = await fetchText(sitemapUrl);
  if (!xml) return [];

  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1];
    const lower = url.toLowerCase();
    if (AFFILIATE_KEYWORDS.some((kw) => lower.includes(kw))) {
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Crawl a shop website for affiliate program evidence.
 *
 * Steps:
 * 1. Fetch the main page, detect tracking scripts
 * 2. Search for affiliate-related keywords and links
 * 3. Check sitemap.xml for affiliate pages
 * 4. Try common affiliate subpages + found links
 * 5. Collect all evidence for LLM analysis
 */
export async function crawlShopForAffiliateEvidence(shopUrl: string): Promise<CrawlResult> {
  const result: CrawlResult = {
    shopUrl,
    reachable: false,
    detectedNetworks: [],
    affiliateLinks: [],
    keywordMatches: [],
    subpageSnippets: [],
    sitemapHits: [],
    contactEmail: null,
    metaDescription: null,
  };

  let baseUrl = shopUrl;
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  if (!baseUrl.endsWith("/")) baseUrl += "/";

  // Step 1: Fetch main page
  logger.debug({ shopUrl }, "Crawling main page");
  const mainHtml = await fetchPage(baseUrl);
  if (!mainHtml) {
    logger.warn({ shopUrl }, "Main page unreachable");
    return result;
  }
  result.reachable = true;

  // Step 2: Detect tracking scripts in raw HTML (before stripping tags)
  result.detectedNetworks = detectTrackingNetworks(mainHtml);

  const mainText = htmlToText(mainHtml);
  result.metaDescription = extractMetaDescription(mainHtml);

  // Step 3: Find affiliate-related links
  const allLinks = extractLinks(mainHtml, baseUrl);
  const affiliateLinkSet = new Set<string>();
  for (const link of allLinks) {
    const combined = `${link.href} ${link.text}`.toLowerCase();
    if (AFFILIATE_KEYWORDS.some((kw) => combined.includes(kw))) {
      if (!affiliateLinkSet.has(link.href)) {
        affiliateLinkSet.add(link.href);
        result.affiliateLinks.push(link);
      }
    }
  }

  // Step 4: Search for keyword matches in main page text
  const matchedKeywords = new Set<string>();
  for (const keyword of AFFILIATE_KEYWORDS) {
    if (mainText.toLowerCase().includes(keyword)) {
      matchedKeywords.add(keyword);
    }
  }
  result.keywordMatches = [...matchedKeywords];

  // Step 5: Extract contact email
  const emails = extractEmails(mainText);
  result.contactEmail = emails.find((e) =>
    /^(info|kontakt|contact|hello|hallo|mail|office|team)@/i.test(e),
  ) ?? emails[0] ?? null;

  // Step 6: Check sitemap.xml
  result.sitemapHits = await checkSitemap(baseUrl);

  // Step 7: Try affiliate subpages (common paths + found links + sitemap hits)
  const checkedUrls = new Set<string>();
  const subpageUrls = [
    ...AFFILIATE_PATHS.map((p) => `${baseUrl.replace(/\/$/, "")}${p}`),
    ...result.affiliateLinks.map((l) => l.href),
    ...result.sitemapHits,
  ];

  for (const url of subpageUrls) {
    if (checkedUrls.has(url) || url === baseUrl) continue;
    checkedUrls.add(url);

    try {
      const parsed = new URL(url);
      const baseParsed = new URL(baseUrl);
      if (parsed.hostname !== baseParsed.hostname) continue;
    } catch {
      continue;
    }

    logger.debug({ url }, "Checking affiliate subpage");
    const subHtml = await fetchPage(url);
    if (!subHtml) continue;

    // Also check subpage for tracking scripts
    const subNetworks = detectTrackingNetworks(subHtml);
    for (const n of subNetworks) {
      if (!result.detectedNetworks.includes(n)) {
        result.detectedNetworks.push(n);
      }
    }

    const subText = htmlToText(subHtml);
    for (const keyword of AFFILIATE_KEYWORDS) {
      if (subText.toLowerCase().includes(keyword)) {
        const snippet = extractSnippet(subText, keyword);
        if (snippet) {
          result.subpageSnippets.push({ url, snippet });
          break;
        }
      }
    }

    if (!result.contactEmail) {
      const subEmails = extractEmails(subText);
      if (subEmails.length > 0) result.contactEmail = subEmails[0];
    }

    if (result.subpageSnippets.length >= 5) break;
  }

  logger.info(
    {
      shopUrl,
      networks: result.detectedNetworks,
      linksFound: result.affiliateLinks.length,
      keywordsFound: result.keywordMatches.length,
      subpagesFound: result.subpageSnippets.length,
      sitemapHits: result.sitemapHits.length,
    },
    "Crawl complete",
  );

  return result;
}
