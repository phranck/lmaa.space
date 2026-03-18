import { SHOPCHECK_USER_AGENT, TIMEOUT_PAGE_MS } from "../constants";
import type { ToolDefinition } from "../llm/client";
import { crawl4aiPage, extractMarkdown } from "../pipeline/crawl4ai";
import { extractMainContent } from "../pipeline/research";

const DUCKDUCKGO_HTML_URL = "https://duckduckgo.com/html/";
const MAX_PAGE_CHARS = 8000;

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "fetch_page",
    description:
      "Fetches a URL and returns the page content as text. Use this to read shop pages " +
      "(homepage, imprint, about, shipping, contact) and external sources like trade registers or news sites.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full URL to fetch (must start with http:// or https://)" },
      },
      required: ["url"],
    },
  },
  {
    name: "search_web",
    description:
      "Searches DuckDuckGo and returns top result snippets and URLs. Use this to research " +
      "corporate affiliations, ownership, legal entity, trade register entries, controversies, etc.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query string" },
      },
      required: ["query"],
    },
  },
  {
    name: "finish",
    description:
      "Call this when you have enough information to make a final decision. " +
      "For accept: populate shop_json with the full JSON object as a string. " +
      "For reject: populate short_reason and long_reason with the markdown texts.",
    parameters: {
      type: "object",
      properties: {
        verdict: {
          type: "string",
          enum: ["accept", "reject"],
          description: "The final verdict for this shop",
        },
        short_reason: {
          type: "string",
          description:
            "Reject only: Kurzbegründung (5-6 sentences, no code fences). " +
            "End with a blank line followed by: " +
            "Die vollständige Begründung finden Sie unter:\nhttps://lmaa.space/rejected/[REJECT_TOKEN]",
        },
        long_reason: {
          type: "string",
          description:
            "Reject only: Langbegründung markdown (300-500 words, no code fences). " +
            "MANDATORY structure — follow exactly:\n" +
            "## Einleitung\n[text with [^N] footnotes for every factual claim]\n" +
            "## Ablehnungsgründe\n### [Subsection per reason]\n[text with [^N] footnotes]\n" +
            "## Schluss\n[closing text]\n" +
            "### Quellen\n\n[^1] https://exact-url-you-fetched, Stand: YYYY-MM-DD\n[^2] ...\n\n" +
            "CRITICAL RULES: " +
            "(1) ### Quellen section is MANDATORY — always include it. " +
            "(2) Every concrete factual claim (company name, legal form, size, brands, etc.) MUST have an inline [^N] footnote. " +
            "(3) List EVERY URL you fetched in the Quellen section. " +
            "(4) Only cite URLs you actually fetched with fetch_page.",
        },
        shop_json: {
          type: "string",
          description: "Accept only: the complete shop JSON object serialized as a string. Empty string for reject.",
        },
      },
      required: ["verdict", "short_reason", "long_reason", "shop_json"],
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  onProgress?: (msg: string) => void,
): Promise<string> {
  if (name === "fetch_page") {
    const url = String(args.url ?? "").trim();
    if (!url.startsWith("http")) return "Error: invalid URL";
    onProgress?.(`  Tool: fetch_page ${url}`);
    return fetchPageTool(url);
  }
  if (name === "search_web") {
    const query = String(args.query ?? "").trim();
    if (!query) return "Error: empty query";
    onProgress?.(`  Tool: search_web "${query}"`);
    return searchWebTool(query);
  }
  if (name === "finish") {
    // Handled by the loop — should not reach here
    return "";
  }
  return `Error: unknown tool "${name}"`;
}

async function fetchPageTool(url: string): Promise<string> {
  // Prefer Crawl4AI (handles JS-heavy sites)
  try {
    const result = await crawl4aiPage(url);
    if (result?.success && result.html) {
      const md = extractMarkdown(result);
      const text = md.length > 100 ? md : extractMainContent(result.html);
      if (text.length > 50) {
        const content = truncate(text, MAX_PAGE_CHARS);
        // Append internal links so the agent can discover actual page URLs
        // instead of guessing standard paths like /impressum.
        const internalLinks = result.links?.internal ?? [];
        if (internalLinks.length > 0) {
          const linkLines = internalLinks
            .filter((l) => l.href && (l.href.startsWith("/") || l.href.startsWith("http")))
            .slice(0, 60)
            .map((l) => {
              const label = l.text?.trim().slice(0, 80) ?? "";
              return label ? `- ${l.href} (${label})` : `- ${l.href}`;
            })
            .join("\n");
          return `${content}\n\n--- Interne Links auf dieser Seite ---\n${linkLines}`;
        }
        return content;
      }
    }
  } catch {
    // fall through to direct fetch
  }

  // Fallback: direct HTTP fetch
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_PAGE_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": SHOPCHECK_USER_AGENT, accept: "text/html,*/*" },
    });
    if (!res.ok) return `HTTP ${res.status} for ${url}`;
    const html = await res.text();
    const text = extractMainContent(html);
    return truncate(text || "(no content extracted)", MAX_PAGE_CHARS);
  } catch (err) {
    return `Fetch error for ${url}: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    clearTimeout(timer);
  }
}

async function searchWebTool(query: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const body = new URLSearchParams({ q: query, kl: "de-de" });
    const res = await fetch(DUCKDUCKGO_HTML_URL, {
      method: "POST",
      body,
      signal: controller.signal,
      headers: {
        "user-agent": SHOPCHECK_USER_AGENT,
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    if (!res.ok) return "Search returned no results.";
    const html = await res.text();

    const snippets: string[] = [];
    const snipRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let m = snipRe.exec(html);
    while (m && snippets.length < 6) {
      const t = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (t.length > 20) snippets.push(t);
      m = snipRe.exec(html);
    }

    const urls: string[] = [];
    const linkRe = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"/gi;
    let lm = linkRe.exec(html);
    while (lm && urls.length < 6) {
      try {
        const raw = lm[1];
        const parsed = new URL(raw, "https://duckduckgo.com");
        const redirect = parsed.searchParams.get("uddg");
        const target = redirect ? decodeURIComponent(redirect) : raw;
        if (/^https?:\/\//.test(target)) urls.push(target);
      } catch { /* ignore */ }
      lm = linkRe.exec(html);
    }

    if (snippets.length === 0 && urls.length === 0) return "No results found.";
    const lines: string[] = [`Results for: "${query}"`, ""];
    const count = Math.max(snippets.length, urls.length);
    for (let i = 0; i < count; i++) {
      if (urls[i]) lines.push(`URL: ${urls[i]}`);
      if (snippets[i]) lines.push(`Snippet: ${snippets[i]}`);
      lines.push("");
    }
    return lines.join("\n").trim();
  } catch (err) {
    return `Search error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    clearTimeout(timer);
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[... truncated]`;
}
