/**
 * Server-side Markdown renderer with media alias resolution.
 * For Astro SSR / frontmatter use only — never import this in React islands.
 */
import { apiGet } from "./api";
import { type MarkdownMediaAliases, renderMarkdown } from "./markdown";

let cachedAliases: MarkdownMediaAliases | null = null;
let cacheTimestamp = 0;
const ALIAS_CACHE_TTL_MS = 60_000;

async function loadMediaAliases(): Promise<MarkdownMediaAliases> {
  const now = Date.now();
  if (cachedAliases && now - cacheTimestamp < ALIAS_CACHE_TTL_MS) {
    return cachedAliases;
  }

  try {
    cachedAliases = await apiGet<MarkdownMediaAliases>("/media-shortcode-assets");
    cacheTimestamp = now;
  } catch {
    try {
      cachedAliases = await apiGet<Record<string, string>>("/media-aliases");
      cacheTimestamp = now;
    } catch {
      cachedAliases ??= {};
    }
  }

  return cachedAliases;
}

/**
 * Renders Markdown into sanitized HTML, resolving media aliases via the backend API.
 *
 * @param content - Markdown source text.
 * @param options - Renderer options. `breaks` turns a single newline into a
 *   line break, which is what an author means when they type one into a
 *   single-line field.
 * @returns HTML string safe for insertion into trusted templates.
 */
export async function renderMarkdownSSR(
  content: string,
  options: { breaks?: boolean } = {},
): Promise<string> {
  const aliases = await loadMediaAliases();
  return renderMarkdown(content, aliases, options);
}
