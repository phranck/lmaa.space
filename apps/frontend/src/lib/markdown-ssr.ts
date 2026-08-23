/**
 * Server-side Markdown renderer with media alias resolution.
 * For Astro SSR / frontmatter use only — never import this in React islands.
 */
import { expandSiteVariables, type SiteVariableValues } from "@lmaa/shared";

import { apiGet } from "./api";
import { type MarkdownMediaAliases, renderMarkdown } from "./markdown";

let cachedAliases: MarkdownMediaAliases | null = null;
let cacheTimestamp = 0;
const ALIAS_CACHE_TTL_MS = 60_000;
/** The same window the aliases keep, because both follow an edit in the dashboard. */
const VARIABLE_CACHE_TTL_MS = 60_000;

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
 * Money as this site writes it.
 *
 * Built once at module scope rather than per rendered text, because the call
 * that formats is also the call that builds the formatter. Austrian, like the
 * amounts the support ladder shows, so a figure named in a sentence and the
 * same figure shown beside a field are written the same way.
 */
const EURO = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

let cachedVariables: SiteVariableValues | null = null;
let variablesTimestamp = 0;

/**
 * The figures a text may name, from the settings, cached as the aliases are.
 *
 * A failure keeps whatever was last known rather than reaching for a zero,
 * because a wrong number in a sentence about money is worse than a stale one.
 * Before anything is known it returns nothing, and the names are then left
 * standing in the text, which at least says plainly that something is missing.
 */
async function loadSiteVariables(): Promise<SiteVariableValues | null> {
  const now = Date.now();
  if (cachedVariables && now - variablesTimestamp < VARIABLE_CACHE_TTL_MS) {
    return cachedVariables;
  }

  try {
    const payload = await apiGet<{ costsTotalCents: number }>("/sponsors");
    cachedVariables = { annualCostCents: payload.costsTotalCents };
    variablesTimestamp = now;
  } catch {
    // Whatever was last known stands, and nothing does on the first failure.
  }

  return cachedVariables;
}

/**
 * Renders Markdown into sanitized HTML, resolving media aliases via the backend API.
 *
 * The figures the settings own are put in place of their names first, so a page
 * may write `{annualCost}` and have it read as money. That happens before the
 * Markdown is parsed, so a variable inside a heading or a link works like one
 * anywhere else.
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
  const [aliases, variables] = await Promise.all([loadMediaAliases(), loadSiteVariables()]);
  const expanded = variables
    ? expandSiteVariables(content, variables, (cents) => EURO.format(cents / 100))
    : content;
  return renderMarkdown(expanded, aliases, options);
}
