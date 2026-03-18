import { CRAWL4AI_TIMEOUT_MS, CRAWL4AI_URL } from "../constants";

export type Crawl4AILink = {
  href: string;
  text: string;
};

export type Crawl4AIResult = {
  url: string;
  success: boolean;
  status_code: number | null;
  html: string;
  markdown: string | { raw_markdown: string; fit_markdown?: string | null } | null;
  links: {
    internal: Crawl4AILink[];
    external: Crawl4AILink[];
  } | null;
  error_message?: string | null;
};

type Crawl4AIResponse = {
  results?: Crawl4AIResult[];
};

const BROWSER_CONFIG = { type: "BrowserConfig", params: { headless: true } };
const CRAWLER_CONFIG = {
  type: "CrawlerRunConfig",
  params: {
    cache_mode: "bypass",
    // DefaultMarkdownGenerator + PruningContentFilter removes navigation, ads and
    // boilerplate and writes the cleaned result into fit_markdown — significantly
    // better for Impressum / legal pages than raw_markdown.
    markdown_generator: {
      type: "DefaultMarkdownGenerator",
      params: {
        content_filter: {
          type: "PruningContentFilter",
          params: { threshold: 0.45, threshold_type: "dynamic", min_word_threshold: 5 },
        },
      },
    },
  },
};

export function extractMarkdown(result: Crawl4AIResult): string {
  if (!result.markdown) return "";
  if (typeof result.markdown === "string") return result.markdown;
  // Prefer fit_markdown (boilerplate-filtered) when available; fall back to raw.
  const fit = result.markdown.fit_markdown;
  if (fit && fit.trim().length > 50) return fit;
  return result.markdown.raw_markdown ?? "";
}

export async function crawl4aiPages(urls: string[]): Promise<Crawl4AIResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRAWL4AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${CRAWL4AI_URL}/crawl`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls,
        browser_config: BROWSER_CONFIG,
        crawler_config: CRAWLER_CONFIG,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Crawl4AIResponse;
    return data.results ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function crawl4aiPage(url: string): Promise<Crawl4AIResult | null> {
  const results = await crawl4aiPages([url]);
  return results[0] ?? null;
}

export function describeCrawl4AIResult(result: Crawl4AIResult): string {
  if (result.success) {
    const mdLen = extractMarkdown(result).length;
    const htmlLen = result.html?.length ?? 0;
    return `ok (status=${result.status_code}, html=${htmlLen}b, markdown=${mdLen}b)`;
  }
  return `failed (status=${result.status_code ?? "?"}, error="${result.error_message ?? "unknown"}")`;
}

export async function waitForCrawl4AI(): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await fetch(`${CRAWL4AI_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}
