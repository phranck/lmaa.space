/**
 * Server-side Markdown renderer with media alias resolution.
 * For Astro SSR / frontmatter use only — never import this in React islands.
 */
import type { Payee, SponsorsPayload } from "@lmaa/contracts";
import { expandSiteVariables, formatEuroCents, type SiteVariableValues } from "@lmaa/shared";

import { apiGet, apiGetInternal } from "./api";
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
    // Two sources, because the account is served to this renderer alone whilst
    // the costs are public. Fetched together, so a text naming both waits once.
    const [sponsors, payee] = await Promise.all([
      apiGet<SponsorsPayload>("/sponsors"),
      apiGetInternal<Payee>("/internal/payee"),
    ]);
    cachedVariables = {
      annualCostCents: sponsors.costsTotalCents,
      sponsorMinimumCents: sponsors.minAmountCents,
      payeeName: payee.payeeName,
      payeeIban: payee.payeeIban,
      payeeBic: payee.payeeBic,
      donatedYearCents: sponsors.coveredCents,
      donatedMonthCents: sponsors.donatedMonthCents,
    };
    variablesTimestamp = now;
  } catch {
    // Whatever was last known stands, and nothing does on the first failure.
  }

  return cachedVariables;
}

/**
 * Puts the figures the settings own in place of their names.
 *
 * Called as early as a text is read rather than only before it is rendered, so
 * a variable works the same inside a shortcode's attribute as it does in the
 * prose around it. Running twice over the same text changes nothing, because
 * what it replaced is no longer a name.
 *
 * @param text - What was written, with or without variables in it.
 * @returns The text with every known variable replaced, or unchanged when the
 *   figures have never been read.
 */
export async function expandVariablesSSR(text: string): Promise<string> {
  const variables = await loadSiteVariables();
  return variables ? expandSiteVariables(text, variables, formatEuroCents) : text;
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
  const [aliases, expanded] = await Promise.all([loadMediaAliases(), expandVariablesSSR(content)]);
  return renderMarkdown(expanded, aliases, options);
}
