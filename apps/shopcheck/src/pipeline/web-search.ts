import { TIMEOUT_PAGE_MS, TIMEOUT_SEARCH_MS } from "../constants";
import { extractMainContent } from "./research";
import type { FetchedPage } from "./research";

const DUCKDUCKGO_HTML_URL = "https://duckduckgo.com/html/";

function extractLinksFromSearchHtml(html: string): string[] {
  const links: string[] = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"/gi;
  let m: RegExpExecArray | null = re.exec(html);
  while (m) {
    try {
      const raw = m[1];
      if (!raw) continue;
      const url = new URL(raw, "https://duckduckgo.com");
      const redirect = url.searchParams.get("uddg");
      const target = redirect ? decodeURIComponent(redirect) : raw;
      if (/^https?:\/\//.test(target)) links.push(target);
    } catch {
      // ignore
    }
    m = re.exec(html);
  }
  return [...new Set(links)];
}

function extractSnippetsFromSearchHtml(html: string): string[] {
  const snippets: string[] = [];
  const re = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m = re.exec(html);
  while (m) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 20) snippets.push(text);
    m = re.exec(html);
  }
  return snippets;
}

/** Run ONE DuckDuckGo search and return both URLs and snippets from the same response. */
async function runSearchForResults(
  query: string,
  userAgent: string,
): Promise<{ urls: string[]; snippets: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_SEARCH_MS);
  try {
    const body = new URLSearchParams({ q: query, kl: "de-de" });
    const res = await fetch(DUCKDUCKGO_HTML_URL, {
      method: "POST",
      body,
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    if (!res.ok) return { urls: [], snippets: [] };
    const html = await res.text();
    return {
      urls: extractLinksFromSearchHtml(html),
      snippets: extractSnippetsFromSearchHtml(html),
    };
  } catch {
    return { urls: [], snippets: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function runSearch(query: string, userAgent: string): Promise<string[]> {
  const { urls } = await runSearchForResults(query, userAgent);
  return urls;
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
    if (!res.ok) return null;
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

export async function webSearchFallback({
  shopName,
  shopUrl,
  userAgent,
  onProgress,
}: {
  shopName: string;
  shopUrl: string;
  userAgent: string;
  onProgress?: (message: string) => void;
}): Promise<FetchedPage[]> {
  const hostname = new URL(shopUrl).hostname;
  const queries = [
    `site:${hostname} impressum`,
    `site:${hostname} kontakt`,
    `site:${hostname} datenschutz`,
    `site:${hostname} versand`,
    `site:${hostname} agb`,
    `site:${hostname} versandinformationen OR lieferbedingungen`,
    `"${shopName}" impressum`,
    `"${shopName}" Unternehmen`,
    `"${shopName}" Erfahrungen`,
  ];

  const out: FetchedPage[] = [];
  for (const query of queries) {
    onProgress?.(`Web search: ${query}`);
    const links = await runSearch(query, userAgent);
    for (const link of links.slice(0, 3)) {
      if (out.some((p) => p.url === link)) continue;
      const page = await fetchPage(link, userAgent);
      if (page) out.push(page);
      if (out.length >= 15) return out;
    }
  }
  return out;
}

export type ExternalContext = {
  query: string;
  snippets: string[];
  urls: string[];
};

/**
 * Collect text snippets for a specific shop via site-targeted DuckDuckGo searches.
 * Used as a data fallback when crawled pages have thin content (e.g. JS-heavy sites).
 */
export async function collectSiteSnippets({
  shopName,
  shopUrl,
  userAgent,
  onProgress,
}: {
  shopName: string;
  shopUrl: string;
  userAgent: string;
  onProgress?: (message: string) => void;
}): Promise<ExternalContext[]> {
  const hostname = new URL(shopUrl).hostname.replace(/^www\./, "");
  const queries = [
    `site:${hostname} impressum`,
    `site:${hostname} versand kontakt`,
    `"${shopName}" impressum`,
    `"${shopName}" shop`,
  ];
  const results: ExternalContext[] = [];
  for (const query of queries) {
    onProgress?.(`Snippet fallback: ${query}`);
    const { snippets, urls } = await runSearchForResults(query, userAgent);
    if (snippets.length > 0 || urls.length > 0) {
      results.push({ query, snippets: snippets.slice(0, 5), urls: urls.slice(0, 3) });
    }
  }
  return results;
}

/**
 * Run counter-research queries to find external signals about corporate ties,
 * dropshipping, far-right associations, and address/legal data.
 * Returns snippets + source URLs for LLM context and external crawling.
 */
export async function searchExternalContext({
  shopName,
  userAgent,
  onProgress,
}: {
  shopName: string;
  userAgent: string;
  onProgress?: (message: string) => void;
}): Promise<ExternalContext[]> {
  const queries = [
    `"${shopName}" Konzern OR Tochterunternehmen OR Holding`,
    `"${shopName}" Dropshipping`,
    `"${shopName}" rechtsextrem OR rechts OR Neonazi OR Identitaer`,
    `"${shopName}" Impressum`,
    `"${shopName}" Inhaber OR Geschäftsführer`,
    `"${shopName}" Handelsregister`,
  ];

  const results: ExternalContext[] = [];
  for (const query of queries) {
    onProgress?.(`External research: ${query}`);
    const { snippets, urls } = await runSearchForResults(query, userAgent);
    if (snippets.length > 0 || urls.length > 0) {
      results.push({ query, snippets: snippets.slice(0, 5), urls: urls.slice(0, 4) });
    }
  }
  return results;
}

export type SocialSearchResult = Partial<Record<
  "mastodon" | "bluesky" | "twitter" | "instagram" | "tiktok" | "youtube" |
  "twitch" | "pinterest" | "linkedin" | "facebook" | "threads" | "patreon",
  string
>>;

function normalizeSearchHostname(url: string): string {
  return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
}

function shopNameSearchVariants(shopName: string, shopUrl: string): string[] {
  const hostname = normalizeSearchHostname(shopUrl).replace(/\.[a-z]{2,}$/i, "");
  const hostWords = hostname
    .split(/[.\-_]+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);
  const variants = [
    shopName,
    normalizeSearchHostname(shopUrl),
    hostname,
    hostWords.join(" "),
  ];
  return [...new Set(variants.map((value) => value.trim()).filter(Boolean))];
}

function cleanSocialUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  const removeParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "si", "trk"];
  for (const key of removeParams) url.searchParams.delete(key);
  return url.toString().replace(/\/+$/, "");
}

export function sanitizeSocialProfileUrl(platform: keyof SocialSearchResult, raw: string): string | null {
  try {
    const cleaned = cleanSocialUrl(raw);
    const url = new URL(cleaned);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    const lower = `${host}${path}`.toLowerCase();

    if (platform === "instagram") {
      if (!host.includes("instagram.com") || /^\/(p|reel|stories|explore)\//i.test(path) || path === "") return null;
    } else if (platform === "facebook") {
      if (!host.includes("facebook.com") || /\/(sharer|share|dialog)\b/i.test(path) || lower.includes("sharer.php")) return null;
    } else if (platform === "tiktok") {
      if (!host.includes("tiktok.com") || !/^\/@[^/]+/i.test(path)) return null;
    } else if (platform === "youtube") {
      if (!(host.includes("youtube.com") || host.includes("youtu.be"))) return null;
      if (/^\/(watch|shorts|live)\b/i.test(path)) return null;
      if (!( /^\/(@|channel\/|c\/|user\/)/i.test(path) || host.includes("youtu.be") )) return null;
    } else if (platform === "linkedin") {
      if (!host.includes("linkedin.com") || !/^\/(company|in)\//i.test(path)) return null;
    } else if (platform === "twitter") {
      if (!(host === "x.com" || host === "twitter.com")) return null;
      if (/^\/(share|search|hashtag|intent|i\/)/i.test(path)) return null;
    } else if (platform === "bluesky") {
      if (!host.includes("bsky.app") || !/^\/profile\//i.test(path)) return null;
    } else if (platform === "mastodon") {
      if (!/^\/@[^/\s]+/i.test(path)) return null;
    } else if (platform === "pinterest") {
      if (!host.includes("pinterest.") || /^\/pin\//i.test(path) || path === "") return null;
    } else if (platform === "threads") {
      if (!host.includes("threads.net") || !/^\/@[^/\s]+/i.test(path)) return null;
    } else if (platform === "twitch") {
      if (!host.includes("twitch.tv") || /^\/(directory|downloads|jobs)\b/i.test(path) || path === "") return null;
    } else if (platform === "patreon") {
      if (!host.includes("patreon.com") || /^\/(login|join|posts)\b/i.test(path) || path === "") return null;
    }

    return cleaned;
  } catch {
    return null;
  }
}

const SOCIAL_SEARCH_CONFIGS: Array<{
  key: keyof SocialSearchResult;
  domains: string[];
  queries: (term: string) => string[];
}> = [
  { key: "instagram", domains: ["instagram.com"], queries: (term) => [`"${term}" site:instagram.com`, `"${term}" instagram`] },
  { key: "facebook", domains: ["facebook.com"], queries: (term) => [`"${term}" site:facebook.com`, `"${term}" facebook`] },
  { key: "tiktok", domains: ["tiktok.com"], queries: (term) => [`"${term}" site:tiktok.com`, `"${term}" tiktok`] },
  { key: "youtube", domains: ["youtube.com", "youtu.be"], queries: (term) => [`"${term}" site:youtube.com OR site:youtu.be`, `"${term}" youtube`] },
  { key: "linkedin", domains: ["linkedin.com"], queries: (term) => [`"${term}" site:linkedin.com`, `"${term}" linkedin`] },
  { key: "twitter", domains: ["x.com", "twitter.com"], queries: (term) => [`"${term}" site:x.com OR site:twitter.com`, `"${term}" twitter`] },
  { key: "bluesky", domains: ["bsky.app"], queries: (term) => [`"${term}" site:bsky.app`, `"${term}" bluesky`] },
  { key: "mastodon", domains: [], queries: (term) => [`"${term}" mastodon`] },
  { key: "pinterest", domains: ["pinterest.com", "pinterest.de"], queries: (term) => [`"${term}" site:pinterest.com OR site:pinterest.de`, `"${term}" pinterest`] },
  { key: "threads", domains: ["threads.net"], queries: (term) => [`"${term}" site:threads.net`, `"${term}" threads`] },
];

/**
 * Actively search for social media profiles not found via href extraction.
 * Only searches for platforms where no link was already found.
 */
export async function searchSocialMedia({
  shopName,
  shopUrl,
  existingSocial,
  userAgent,
  onProgress,
}: {
  shopName: string;
  shopUrl: string;
  existingSocial: Record<string, string | null>;
  userAgent: string;
  onProgress?: (message: string) => void;
}): Promise<SocialSearchResult> {
  const found: SocialSearchResult = {};
  let searchCount = 0;
  const maxSearches = 24;
  const queryTerms = shopNameSearchVariants(shopName, shopUrl);

  for (const config of SOCIAL_SEARCH_CONFIGS) {
    if (searchCount >= maxSearches) break;
    if (existingSocial[config.key]) continue;

    for (const term of queryTerms) {
      if (searchCount >= maxSearches || found[config.key]) break;
      for (const query of config.queries(term)) {
        if (searchCount >= maxSearches || found[config.key]) break;
        onProgress?.(`Social search: ${query}`);
        searchCount++;

        const links = await runSearch(query, userAgent);
        for (const link of links.slice(0, 5)) {
          const lower = link.toLowerCase();
          const domainMatch = config.domains.length === 0
            ? /https?:\/\/[^/]+\/@[^/\s]+/i.test(link)
            : config.domains.some((domain) => lower.includes(domain));
          if (!domainMatch) continue;

          const sanitized = sanitizeSocialProfileUrl(config.key, link);
          if (sanitized) {
            found[config.key] = sanitized;
            break;
          }
        }
      }
    }
  }

  return found;
}
