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
    `"${shopName}" impressum`,
  ];

  const out: FetchedPage[] = [];
  for (const query of queries) {
    onProgress?.(`Web search fallback: ${query}`);
    const links = await runSearch(query, userAgent);
    for (const link of links.slice(0, 3)) {
      if (out.some((p) => p.url === link)) continue;
      const page = await fetchPage(link, userAgent);
      if (page) out.push(page);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

