import { analyzeShopWithLlm } from "./analyze";
import { crawl4aiPages, extractMarkdown } from "./crawl4ai";
import type { DecisionOutcome } from "./decision";
import type { ExtractedFacts } from "./extract";
import { geocodeWithFallback, type GeoResult } from "./geocode";
import { buildShopJson, type RejectionMarkdown, type ShopJson } from "./output";
import { extractMainContent, type FetchedPage } from "./research";
import { collectSiteSnippets, searchExternalContext, searchSocialMedia, type ExternalContext } from "./web-search";
import { SHOPCHECK_USER_AGENT } from "../constants";
import { LlmFatalError, getLlmProvider, getModelName, llmGenerate } from "../llm/client";

const EMPTY_SOCIAL_MEDIA: ExtractedFacts["socialMedia"] = {
  mastodon: null,
  bluesky: null,
  twitter: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  twitch: null,
  pinterest: null,
  linkedin: null,
  facebook: null,
  threads: null,
  patreon: null,
};

const EMPTY_GEO_RESULT: GeoResult = {
  latitude: null,
  longitude: null,
  source: "not requested",
};

const REJECTION_LINK_BLOCK = [
  "Die vollständige Begründung finden Sie unter:",
  "https://lmaa.space/rejected/[REJECT_TOKEN]",
].join("\n");

/** Crawl external URLs found by DuckDuckGo searches — excludes the shop's own domain. */
async function crawlExternalSources(
  externalContext: ExternalContext[],
  shopUrl: string,
  onProgress?: (message: string) => void,
): Promise<FetchedPage[]> {
  const shopHostname = new URL(shopUrl).hostname;
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const ctx of externalContext) {
    for (const url of ctx.urls) {
      try {
        const hostname = new URL(url).hostname;
        if (hostname === shopHostname || hostname.endsWith(`.${shopHostname}`)) continue;
        if (seen.has(url)) continue;
        seen.add(url);
        candidates.push(url);
      } catch {
        // ignore invalid URLs
      }
    }
  }

  const targets = candidates.slice(0, 8);
  if (targets.length === 0) return [];

  onProgress?.(`Crawling ${targets.length} external sources: ${targets.map((u) => new URL(u).hostname).join(", ")}`);
  const results = await crawl4aiPages(targets);
  const pages: FetchedPage[] = [];
  for (const r of results) {
    if (!r.success || !r.html) continue;
    const md = extractMarkdown(r);
    const text = md.length > 100 ? md : extractMainContent(r.html);
    if (text.length > 100) {
      pages.push({ url: r.url, status: r.status_code ?? 200, html: r.html, text });
      onProgress?.(`  External page crawled: ${r.url} (${text.length}b)`);
    }
  }
  return pages;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function mergeFacts(base: ExtractedFacts, patch: Partial<ExtractedFacts>): ExtractedFacts {
  const patchSocial: Partial<ExtractedFacts["socialMedia"]> = patch.socialMedia ?? {};
  return {
    legalEntity: patch.legalEntity ?? base.legalEntity,
    legalEntityType: patch.legalEntityType ?? base.legalEntityType,
    owners: uniqueStrings([...(base.owners ?? []), ...(patch.owners ?? [])]),
    address: {
      street: patch.address?.street ?? base.address.street,
      postalCode: patch.address?.postalCode ?? base.address.postalCode,
      city: patch.address?.city ?? base.address.city,
      state: patch.address?.state ?? base.address.state,
      countryCode: patch.address?.countryCode ?? base.address.countryCode,
      sourceUrl: patch.address?.sourceUrl ?? base.address.sourceUrl,
    },
    contact: {
      emails: uniqueStrings([...(base.contact.emails ?? []), ...(patch.contact?.emails ?? [])]),
      phones: uniqueStrings([...(base.contact.phones ?? []), ...(patch.contact?.phones ?? [])]),
    },
    shippingRegions: [...new Set([...(patch.shippingRegions ?? []), ...base.shippingRegions])],
    languageGermanLikely: patch.languageGermanLikely ?? base.languageGermanLikely,
    exclusionSignals: uniqueStrings([...(base.exclusionSignals ?? []), ...(patch.exclusionSignals ?? [])]),
    socialMedia: {
      mastodon: patchSocial.mastodon ?? base.socialMedia.mastodon,
      bluesky: patchSocial.bluesky ?? base.socialMedia.bluesky,
      twitter: patchSocial.twitter ?? base.socialMedia.twitter,
      instagram: patchSocial.instagram ?? base.socialMedia.instagram,
      tiktok: patchSocial.tiktok ?? base.socialMedia.tiktok,
      youtube: patchSocial.youtube ?? base.socialMedia.youtube,
      twitch: patchSocial.twitch ?? base.socialMedia.twitch,
      pinterest: patchSocial.pinterest ?? base.socialMedia.pinterest,
      linkedin: patchSocial.linkedin ?? base.socialMedia.linkedin,
      facebook: patchSocial.facebook ?? base.socialMedia.facebook,
      threads: patchSocial.threads ?? base.socialMedia.threads,
      patreon: patchSocial.patreon ?? base.socialMedia.patreon,
    },
    affiliateInfoUrl: patch.affiliateInfoUrl ?? base.affiliateInfoUrl,
    notes: {
      focus: uniqueStrings([...(base.notes.focus ?? []), ...(patch.notes?.focus ?? [])]),
      brandsOrProducts: uniqueStrings([...(base.notes.brandsOrProducts ?? []), ...(patch.notes?.brandsOrProducts ?? [])]),
      companyPresentation: patch.notes?.companyPresentation ?? base.notes.companyPresentation,
    },
    evidence: [...(base.evidence ?? []), ...(patch.evidence ?? [])],
  };
}


function buildRejectionPrompt({
  shopName,
  shopUrl,
  decision,
  facts,
  externalContext,
  externalPages,
  shopPages,
}: {
  shopName: string;
  shopUrl: string;
  decision: DecisionOutcome;
  facts: ExtractedFacts;
  externalContext: ExternalContext[];
  externalPages: FetchedPage[];
  shopPages: FetchedPage[];
}): string {
  const failedCriteria = decision.criteria.filter((c) => c.result === "✗");
  const unclearCriteria = decision.criteria.filter((c) => c.result === "~");
  const today = new Date().toISOString().slice(0, 10);
  const shopHostname = new URL(shopUrl).hostname;

  // Select the most citation-worthy shop pages (impressum, about, contact, shipping)
  const priorityKeywords = ["impressum", "imprint", "legal", "ueber", "uber", "about", "kontakt", "contact", "versand", "shipping"];
  const relevantShopPages = shopPages
    .filter((p) => {
      try { return new URL(p.url).hostname === shopHostname; } catch { return false; }
    })
    .sort((a, b) => {
      const scoreA = priorityKeywords.findIndex((kw) => a.url.toLowerCase().includes(kw));
      const scoreB = priorityKeywords.findIndex((kw) => b.url.toLowerCase().includes(kw));
      return (scoreA === -1 ? 99 : scoreA) - (scoreB === -1 ? 99 : scoreB);
    })
    .slice(0, 5);

  // Build the unified source list: external crawled pages first, then relevant shop pages,
  // then uncrawled search result URLs (external only).
  type SourceEntry = { url: string; text?: string; snippets?: string[] };
  const seen = new Set<string>();
  const sources: SourceEntry[] = [];

  for (const p of externalPages) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    sources.push({ url: p.url, text: p.text.slice(0, 2500) });
  }
  for (const p of relevantShopPages) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    sources.push({ url: p.url, text: p.text.slice(0, 2500) });
  }
  // Add the shop root URL if not already included
  if (!seen.has(shopUrl)) {
    seen.add(shopUrl);
    sources.push({ url: shopUrl });
  }
  // Uncrawled external search result URLs with their snippets
  for (const ctx of externalContext) {
    for (const url of ctx.urls.slice(0, 4)) {
      if (seen.has(url)) continue;
      try {
        const h = new URL(url).hostname;
        if (h === shopHostname || h.endsWith(`.${shopHostname}`)) continue;
      } catch { continue; }
      seen.add(url);
      const snippets = externalContext
        .filter((c) => c.urls.includes(url))
        .flatMap((c) => c.snippets.slice(0, 2));
      sources.push({ url, snippets: snippets.length > 0 ? snippets : undefined });
      if (sources.length >= 12) break;
    }
    if (sources.length >= 12) break;
  }

  // Build the sources-with-content section
  const sourcesSection: string[] = [
    "## Quellen mit Seiteninhalt",
    "Die folgenden Quellen sind nummeriert. Verwende AUSSCHLIESSLICH diese Nummern als Fußnoten.",
    "Setze eine Fußnote [^N] nur, wenn der behauptete Fakt tatsächlich aus dieser Quelle hervorgeht.",
    "",
  ];
  for (const [i, src] of sources.entries()) {
    sourcesSection.push(`### [^${i + 1}] ${src.url}`);
    if (src.text) {
      sourcesSection.push(src.text.trim());
    } else if (src.snippets?.length) {
      sourcesSection.push("Suchergebnis-Snippets:");
      for (const s of src.snippets) sourcesSection.push(`  ${s}`);
    } else {
      sourcesSection.push("(kein gecrawlter Inhalt verfügbar)");
    }
    sourcesSection.push("");
  }

  return [
    "Verfasse eine strukturierte Ablehnungsbegründung für diesen Online-Shop.",
    "Das Prüfergebnis ist endgültig entschieden und darf nicht neu bewertet werden.",
    "Begründe AUSSCHLIESSLICH die tatsächlich gescheiterten Kriterien aus dem Prüfergebnis.",
    "Erfinde KEINE zusätzlichen Ablehnungsgründe, die nicht im Prüfergebnis stehen.",
    "",
    "## Shop",
    `Name: ${shopName}`,
    `URL: ${shopUrl}`,
    "",
    "## Gescheiterte Kriterien (Basis der Begründung)",
    ...failedCriteria.map((c) => `- [✗] ${c.label}: ${c.note}`),
    ...(unclearCriteria.length > 0 ? ["", "## Unklare Punkte (optional erwähnen)"] : []),
    ...unclearCriteria.map((c) => `- [~] ${c.label}: ${c.note}`),
    "",
    "## Verifizierte Fakten",
    JSON.stringify({
      legalEntity: facts.legalEntity,
      legalEntityType: facts.legalEntityType,
      address: facts.address,
      evidence: facts.evidence.slice(0, 8),
    }, null, 2),
    "",
    ...sourcesSection,
    "## Regeln",
    "- Deutsch mit echten Umlauten (ä, ö, ü, ß). Keine Em-Dashes.",
    "- Neutral, sachlich, keine Spekulation.",
    "- lmaa.space nicht erwähnen.",
    "- Fußnoten ([^N]) nur setzen, wenn der Fakt im Seiteninhalt der Quelle tatsächlich belegt ist.",
    "- Fußnoten im Text mit Leerzeichen trennen: [^1] [^2]",
    "- Jede Quellen-URL die im ### Quellen-Abschnitt erscheint MUSS mindestens einmal im Fließtext zitiert werden.",
    "- Die Langbegründung MUSS am Ende einen Abschnitt '### Quellen' enthalten.",
    `- Stand-Datum für alle Quellen: ${today}`,
    "",
    "## Ausgabe",
    "Gib genau folgende Struktur aus, gefüllt mit dem tatsächlichen Inhalt. Kein Text davor oder danach.",
    "",
    `### Shop-Prüfung: ${shopName}`,
    "",
    `**URL:** ${shopUrl}`,
    "",
    "## Kurzbegründung",
    "```md",
    "[5–6 Sätze: Hauptablehnungsgrund mit den wichtigsten Einzelpunkten. Für Dashboard-Kommentarfeld.]",
    "",
    REJECTION_LINK_BLOCK,
    "```",
    "",
    "## Langbegründung",
    "```md",
    "[300–500 Wörter. Abschnitte: ## Einleitung / ## Ablehnungsgründe (### Unterabschnitt je Grund) / ## Schluss. Inline-Quellenangaben als [^N] direkt bei der zitierten Aussage.]",
    "",
    "### Quellen",
    "[^1] https://..., Stand: YYYY-MM-DD",
    "```",
  ].join("\n");
}

async function generateRejectionOutput(
  prompt: string,
  onProgress?: (msg: string) => void,
): Promise<string> {
  onProgress?.(`Rejection prompt: ${prompt.length} chars (~${Math.ceil(prompt.length / 3.5)} tokens)`);
  let response = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: 0.2,
    });
    onProgress?.(`Rejection attempt ${attempt + 1}: ${response.length} chars, hasKurz=${response.includes("## Kurzbegründung")}, hasLang=${response.includes("## Langbegründung")}`);
    if (response.length > 0 && !response.includes("## Kurzbegründung")) {
      onProgress?.(`Rejection raw snippet: ${response.slice(0, 200).replace(/\n/g, "↵")}`);
    }
    if (response.includes("## Kurzbegründung") && response.includes("## Langbegründung")) {
      return response;
    }
  }
  return response;
}

/**
 * Removes Quellen entries that are never referenced in the body text,
 * then renumbers all footnotes sequentially starting from 1.
 */
function normalizeFootnotes(longReason: string): string {
  const quellenIdx = longReason.indexOf("\n### Quellen");
  if (quellenIdx === -1) return longReason;

  const body = longReason.slice(0, quellenIdx + 1);
  const quellenSection = longReason.slice(quellenIdx + 1);

  // Collect which [^N] numbers actually appear in the body
  const usedNums = new Set<number>();
  for (const m of body.matchAll(/\[\^(\d+)\]/g)) usedNums.add(Number(m[1]));

  // Parse Quellen lines: [^N] url, Stand: date
  const entries: Array<{ num: number; content: string }> = [];
  for (const m of quellenSection.matchAll(/^\[\^(\d+)\]\s+(.+)$/gm)) {
    entries.push({ num: Number(m[1]), content: m[2] });
  }

  const kept = entries.filter((e) => usedNums.has(e.num));
  if (kept.length === 0) return longReason;

  // Build old→new number mapping for renumbering
  const renum = new Map<number, number>();
  kept.forEach((e, i) => renum.set(e.num, i + 1));

  const renumberedBody = body.replace(/\[\^(\d+)\]/g, (_, n) => {
    const next = renum.get(Number(n));
    return next !== undefined ? `[^${next}]` : `[^${n}]`;
  });

  const newQuellen = "### Quellen\n" + kept.map((e) => `[^${renum.get(e.num)}] ${e.content}`).join("\n");
  return renumberedBody + newQuellen;
}

function parseRejectionMarkdownFromResponse(text: string): RejectionMarkdown | null {
  // Strategy 1: sections with explicit ```md code fences
  const shortMatch = text.match(/## Kurzbegründung\s*\n\s*```(?:md|markdown)?\s*\n([\s\S]*?)\n```/i);
  const longMatch = text.match(/## Langbegründung\s*\n\s*```(?:md|markdown)?\s*\n([\s\S]*?)\n```/i);
  if (shortMatch?.[1] && longMatch?.[1]) {
    const shortReason = shortMatch[1].trim();
    const longReason = normalizeFootnotes(longMatch[1].trim());
    return {
      shortReason,
      longReason,
      markdown: [
        `### Shop-Prüfung: ${text.match(/^### Shop-Prüfung:\s*(.+)$/m)?.[1] ?? ""}`,
        "",
        text.match(/^\*\*URL:\*\* .+$/m)?.[0] ?? "",
        "",
        "## Kurzbegründung",
        "",
        shortReason,
        "",
        "## Langbegründung",
        "",
        longReason,
        "",
      ].join("\n").trim(),
    };
  }

  // Strategy 2: any two ```md code blocks in the text
  const codeBlocks = [...text.matchAll(/```(?:md|markdown)?\s*\n([\s\S]*?)\n```/g)].map((match) => match[1].trim());
  if (codeBlocks.length >= 2) {
    const shortReason = codeBlocks[0];
    const longReason = normalizeFootnotes(codeBlocks[1]);
    return {
      shortReason,
      longReason,
      markdown: [
        text.match(/^### Shop-Prüfung:[\s\S]*?\*\*URL:\*\* .+$/m)?.[0] ?? "",
        "",
        "## Kurzbegründung",
        "",
        shortReason,
        "",
        "## Langbegründung",
        "",
        longReason,
        "",
      ].join("\n").trim(),
    };
  }

  // Strategy 3: sections without code fences — model wrote plain text after headings
  const shortPlain = text.match(/## Kurzbegründung\s*\n([\s\S]*?)(?=\n## Langbegründung|\n###\s|$)/i);
  const longPlain = text.match(/## Langbegründung\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i);
  if (shortPlain?.[1]?.trim() && longPlain?.[1]?.trim()) {
    const shortReason = shortPlain[1].trim();
    const longReason = normalizeFootnotes(longPlain[1].trim());
    return {
      shortReason,
      longReason,
      markdown: [
        `### Shop-Prüfung: ${text.match(/^### Shop-Prüfung:\s*(.+)$/m)?.[1] ?? ""}`,
        "",
        text.match(/^\*\*URL:\*\* .+$/m)?.[0] ?? "",
        "",
        "## Kurzbegründung",
        "",
        shortReason,
        "",
        "## Langbegründung",
        "",
        longReason,
        "",
      ].join("\n").trim(),
    };
  }

  return null;
}

async function runUnifiedCheckFlow({
  shopUrl,
  shopName,
  preCrawledPages,
  preCrawledFacts,
  admissionCriteriaText,
  categories,
  onProgress,
}: {
  shopUrl: string;
  shopName: string;
  preCrawledPages: FetchedPage[];
  preCrawledFacts: ExtractedFacts;
  admissionCriteriaText: string;
  categories: string[];
  onProgress?: (message: string) => void;
}): Promise<AgentResult> {
  onProgress?.(
    `Agent gestartet (Provider: ${getLlmProvider()}, extraction=${getModelName("extraction")}, narrative=${getModelName("narrative")}, ${preCrawledPages.length} vorgecrawlte Seiten)`,
  );

  const externalContext = await searchExternalContext({
    shopName,
    userAgent: SHOPCHECK_USER_AGENT,
    onProgress,
  });

  const totalPageText = preCrawledPages.reduce((sum, p) => sum + p.text.length, 0);
  if (totalPageText < 2000) {
    onProgress?.(`Thin page content (${totalPageText} chars) — collecting site snippets via web search...`);
    const siteSnippets = await collectSiteSnippets({
      shopName,
      shopUrl,
      userAgent: SHOPCHECK_USER_AGENT,
      onProgress,
    });
    externalContext.push(...siteSnippets);
    onProgress?.(`Site snippet fallback yielded ${siteSnippets.length} query result(s).`);
  }

  const externalPages = await crawlExternalSources(externalContext, shopUrl, onProgress);
  onProgress?.(`External sources: ${externalPages.length} page(s) crawled.`);

  const analysis = await analyzeShopWithLlm({
    shopUrl,
    pages: preCrawledPages,
    deterministicFacts: preCrawledFacts,
    availableCategories: categories,
    admissionCriteriaText,
    externalContext,
    externalPages,
    onProgress,
  });

  let mergedFacts = mergeFacts(preCrawledFacts, analysis.factsPatch);
  const socialSearch = await searchSocialMedia({
    shopName,
    existingSocial: mergedFacts.socialMedia,
    userAgent: SHOPCHECK_USER_AGENT,
    onProgress,
  });
  mergedFacts = mergeFacts(mergedFacts, {
    socialMedia: { ...EMPTY_SOCIAL_MEDIA, ...socialSearch },
  });

  if (analysis.decision.verdict === "accept") {
    const geo = await geocodeWithFallback({
      street: mergedFacts.address.street,
      postalCode: mergedFacts.address.postalCode,
      city: mergedFacts.address.city,
      countryCode: mergedFacts.address.countryCode,
      userAgent: SHOPCHECK_USER_AGENT,
    });
    const shopJson = await buildShopJson({
      shopName,
      shopUrl,
      decision: analysis.decision,
      facts: mergedFacts,
      geo,
      categories: analysis.categories,
      pageTexts: preCrawledPages.map((page) => ({ url: page.url, text: page.text })),
    });
    onProgress?.("Auswertung abgeschlossen.");
    return {
      shopName: shopJson.name,
      shopUrl,
      verdict: "accept",
      shopJson,
      rejectionMarkdown: null,
      fullResponse: "",
    };
  }

  const fullResponse = await generateRejectionOutput(buildRejectionPrompt({
    shopName,
    shopUrl,
    decision: analysis.decision,
    facts: mergedFacts,
    externalContext,
    externalPages,
    shopPages: preCrawledPages,
  }), onProgress);
  const rejectionMarkdown = parseRejectionMarkdownFromResponse(fullResponse);
  onProgress?.("Auswertung abgeschlossen.");
  return {
    shopName,
    shopUrl,
    verdict: "reject",
    shopJson: null,
    rejectionMarkdown,
    fullResponse,
  };
}

export type AgentResult = {
  shopName: string;
  shopUrl: string;
  verdict: "accept" | "reject";
  shopJson: ShopJson | null;
  rejectionMarkdown: RejectionMarkdown | null;
  fullResponse: string;
};

export async function runShopCheckAgent({
  shopUrl,
  shopName,
  preCrawledPages,
  preCrawledFacts,
  admissionCriteriaText,
  categories,
  onProgress,
}: {
  shopUrl: string;
  shopName: string;
  preCrawledPages: FetchedPage[];
  preCrawledFacts: ExtractedFacts;
  admissionCriteriaText: string;
  categories: string[];
  onProgress?: (message: string) => void;
}): Promise<AgentResult> {
  return runUnifiedCheckFlow({
    shopUrl,
    shopName,
    preCrawledPages,
    preCrawledFacts,
    admissionCriteriaText,
    categories,
    onProgress,
  });
}
