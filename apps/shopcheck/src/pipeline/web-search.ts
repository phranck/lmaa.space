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

async function runSearch(query: string, userAgent: string): Promise<string[]> {
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
    if (!res.ok) return [];
    return extractLinksFromSearchHtml(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
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

/** Extract short text snippets from DuckDuckGo search result HTML. */
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

/** Run a search and return snippets (not full pages) for context. */
async function runSearchForSnippets(query: string, userAgent: string): Promise<string[]> {
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
    if (!res.ok) return [];
    return extractSnippetsFromSearchHtml(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export type ExternalContext = {
  query: string;
  snippets: string[];
};

/**
 * Run counter-research queries to find external signals about corporate ties,
 * dropshipping, far-right associations etc. Returns snippets for LLM context.
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
  ];

  const results: ExternalContext[] = [];
  for (const query of queries) {
    onProgress?.(`External research: ${query}`);
    const snippets = await runSearchForSnippets(query, userAgent);
    if (snippets.length > 0) {
      results.push({ query, snippets: snippets.slice(0, 5) });
    }
  }
  return results;
}

export type SocialSearchResult = Partial<Record<
  "mastodon" | "bluesky" | "twitter" | "instagram" | "tiktok" | "youtube" |
  "twitch" | "pinterest" | "linkedin" | "facebook" | "threads" | "patreon",
  string
>>;

const SOCIAL_SEARCH_CONFIGS: Array<{
  key: keyof SocialSearchResult;
  domains: string[];
  query: (name: string) => string;
}> = [
  { key: "instagram", domains: ["instagram.com"], query: (n) => `"${n}" site:instagram.com` },
  { key: "facebook", domains: ["facebook.com"], query: (n) => `"${n}" site:facebook.com` },
  { key: "tiktok", domains: ["tiktok.com"], query: (n) => `"${n}" site:tiktok.com` },
  { key: "youtube", domains: ["youtube.com", "youtu.be"], query: (n) => `"${n}" site:youtube.com` },
  { key: "linkedin", domains: ["linkedin.com"], query: (n) => `"${n}" site:linkedin.com` },
  { key: "twitter", domains: ["x.com", "twitter.com"], query: (n) => `"${n}" site:x.com OR site:twitter.com` },
  { key: "bluesky", domains: ["bsky.app"], query: (n) => `"${n}" site:bsky.app` },
  { key: "mastodon", domains: [], query: (n) => `"${n}" mastodon` },
  { key: "pinterest", domains: ["pinterest.com", "pinterest.de"], query: (n) => `"${n}" site:pinterest.com OR site:pinterest.de` },
  { key: "threads", domains: ["threads.net"], query: (n) => `"${n}" site:threads.net` },
];

/**
 * Actively search for social media profiles not found via href extraction.
 * Only searches for platforms where no link was already found.
 */
export async function searchSocialMedia({
  shopName,
  existingSocial,
  userAgent,
  onProgress,
}: {
  shopName: string;
  existingSocial: Record<string, string | null>;
  userAgent: string;
  onProgress?: (message: string) => void;
}): Promise<SocialSearchResult> {
  const found: SocialSearchResult = {};
  let searchCount = 0;
  const maxSearches = 10;

  for (const config of SOCIAL_SEARCH_CONFIGS) {
    if (searchCount >= maxSearches) break;
    if (existingSocial[config.key]) continue;

    const query = config.query(shopName);
    onProgress?.(`Social search: ${query}`);
    searchCount++;

    const links = await runSearch(query, userAgent);
    for (const link of links.slice(0, 3)) {
      const lower = link.toLowerCase();
      const domainMatch = config.domains.length === 0
        ? /https?:\/\/[^/]+\/@[^/\s]+/i.test(link) // Mastodon pattern
        : config.domains.some((d) => lower.includes(d));
      if (domainMatch) {
        try {
          const u = new URL(link);
          u.hash = "";
          const removeParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "si", "trk"];
          for (const key of removeParams) u.searchParams.delete(key);
          found[config.key] = u.toString().replace(/\/+$/, "");
        } catch {
          found[config.key] = link;
        }
        break;
      }
    }
  }

  return found;
}

