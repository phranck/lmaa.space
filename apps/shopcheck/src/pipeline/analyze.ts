import { MAX_PAGES_PER_CHUNK, TEMPERATURE_EXTRACTION } from "../constants";
import type { CriterionResult, DecisionOutcome } from "./decision";
import { normalizeShipping, type ExtractedFacts } from "./extract";
import type { FetchedPage } from "./research";
import type { ExternalContext } from "./web-search";
import { tryParseJson } from "../lib/utils";
import { LlmFatalError, getModelName, llmGenerate } from "../llm/client";

type LlmAnalysisPayload = {
  extractedFacts?: {
    legalEntity?: string | null;
    legalEntityType?: string | null;
    owners?: string[];
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    state?: string | null;
    countryCode?: string | null;
    emails?: string[];
    phones?: string[];
    shippingRegions?: Array<"DE" | "AT" | "CH" | "EU" | "WORLD">;
    languageGermanLikely?: boolean;
    exclusionSignals?: string[];
    socialMedia?: ExtractedFacts["socialMedia"];
    affiliateInfoUrl?: string | null;
    notes?: ExtractedFacts["notes"];
    evidence?: Array<{
      field: string;
      value: string;
      url: string;
      snippet: string;
      confidence: number;
    }>;
  };
  criteria?: Array<{
    key: string;
    result: string;
    note: string;
  }>;
  categories?: string[];
  verdict?: string;
  unclearPoints?: string[];
};

export type CombinedAnalysisResult = {
  factsPatch: Partial<ExtractedFacts>;
  decision: DecisionOutcome;
  categories: string[];
};

function uniqueStrings(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

const CRITERION_KEYS = [
  "independent", "shipping", "notLargeCorp",
  "notMarketplace", "notDropshipping", "notChain", "notAffiliate", "noFarRight",
] as const;

const CRITERION_LABELS: Record<string, string> = {
  independent: "Eigenständiger Online-Auftritt",
  shipping: "Versand in mindestens ein europäisches Land",
  notLargeCorp: "Kein Großkonzern / keine Konzernmarke",
  notMarketplace: "Keine Handelsplattform",
  notDropshipping: "Kein reines Dropshipping",
  notChain: "Kein Filialist / kein Kaufhaus",
  notAffiliate: "Kein reines Affiliate-Portal",
  noFarRight: "Kein rechtsextremistischer Bezug",
};


// Token budgeting
const TOKEN_BUDGET_OVERHEAD = 4000;
const TOKEN_BUDGET_RESPONSE = 8000;
// Max input tokens for page content (Haiku supports 200k, but we keep prompts compact)
const MAX_INPUT_TOKENS = 65536;
const TOKEN_BUDGET_PAGES = MAX_INPUT_TOKENS - TOKEN_BUDGET_OVERHEAD - TOKEN_BUDGET_RESPONSE;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

const PAGE_CATEGORY_PRIORITY: Array<{ keywords: string[]; priority: number }> = [
  { keywords: ["impressum", "imprint", "legal", "rechtlich", "hinweis"], priority: 0 },
  { keywords: ["kontakt", "contact", "customer-service", "kundendienst"], priority: 1 },
  { keywords: ["ueber", "über", "about", "unternehmen", "company", "our-story", "mission", "philosophie"], priority: 2 },
  { keywords: ["versand", "shipping", "lieferung", "delivery"], priority: 3 },
  { keywords: ["datenschutz", "privacy", "agb", "terms", "widerruf", "bedingungen"], priority: 4 },
  { keywords: ["faq", "hilfe", "help", "service", "info"], priority: 5 },
];

function pagePriority(url: string): number {
  const lower = url.toLowerCase();
  for (const cat of PAGE_CATEGORY_PRIORITY) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.priority;
  }
  return 10;
}

/** Select only the pages relevant for LLM analysis: homepage + pages matching priority keywords. */
function selectRelevantPages(pages: FetchedPage[]): FetchedPage[] {
  if (pages.length === 0) return [];
  const homepage = pages[0];
  const relevant = pages.filter((p, i) => i === 0 || pagePriority(p.url) < 10);
  // If very few relevant pages found, include a few more by text length (likely content-rich)
  if (relevant.length < 5) {
    const remaining = pages
      .filter((p) => !relevant.includes(p))
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, 5 - relevant.length);
    return [...relevant, ...remaining];
  }
  return relevant;
}

/** Split pages into chunks respecting both page count and token budget. All pages are included. */
function chunkPages(pages: FetchedPage[]): FetchedPage[][] {
  const sorted = [...pages].sort((a, b) => pagePriority(a.url) - pagePriority(b.url));
  const chunks: FetchedPage[][] = [];
  let current: FetchedPage[] = [];
  let currentTokens = 0;

  for (const page of sorted) {
    const pageTokens = estimateTokens(page.text);
    const chunkFull = current.length >= MAX_PAGES_PER_CHUNK;
    const budgetExceeded = current.length > 0 && currentTokens + pageTokens > TOKEN_BUDGET_PAGES;
    if (chunkFull || budgetExceeded) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(page);
    currentTokens += pageTokens;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function buildAnalysisPrompt(
  shopUrl: string,
  pages: FetchedPage[],
  deterministicFacts: ExtractedFacts,
  availableCategories: string[],
  admissionCriteriaText: string,
  externalContext: ExternalContext[],
  chunkInfo?: { current: number; total: number },
): string {
  const pagesJson = pages.map((p) => ({
    url: p.url,
    content: p.text,
  }));

  const criteriaSection = admissionCriteriaText
    ? [
        "## Aufnahmekriterien (Quelle: lmaa.space/admissioncriteria — maßgeblich, vollständig lesen!)",
        admissionCriteriaText,
        "",
        "Bewerte ausschließlich anhand der obigen Kriterien. Wende KEIN Kriterium an, das nicht explizit dort steht.",
      ].join("\n")
    : [
        "## Aufnahmekriterien",
        "FEHLER: Die Aufnahmekriterien konnten nicht von lmaa.space/admissioncriteria geladen werden.",
        "Ohne verifizierte Kriterien darfst du KEINEN Shop ablehnen. Setze das verdict auf 'accept' und markiere alle Kriterien als '~'.",
      ].join("\n");

  const chunkNote = chunkInfo && chunkInfo.total > 1
    ? `\n\nHINWEIS: Dies ist Analyse-Chunk ${chunkInfo.current}/${chunkInfo.total}. Analysiere NUR die hier gegebenen Seiten. Ergebnisse werden danach zusammengeführt.\n`
    : "";

  return [
    "Du bist ein Experte für die Bewertung von Online-Shops für das Verzeichnis lmaa.space.",
    "Analysiere die folgenden Shop-Seiten gründlich und vollständig.",
    chunkNote,
    "## Deine Aufgaben",
    "1. Extrahiere alle fehlenden Fakten (Rechtsform, Inhaber, Adresse, Kontakt, Versandregionen, Social Media, Sortiment-Fokus, Marken/Produkte, Affiliate-/Partnerprogramm-URL)",
    "2. Bewerte alle 9 Aufnahmekriterien anhand der Evidenz",
    "3. Ordne passende Kategorien aus der vorgegebenen Liste zu",
    "",
    criteriaSection,
    "",
    "\u2713 = Kriterium klar erfüllt (belastbare Evidenz)",
    "\u2717 = Kriterium klar verletzt (belastbare Evidenz dagegen)",
    "~ = Unklar/nicht belastbar nachweisbar",
    "",
    "## Bereits deterministisch extrahierte Fakten",
    JSON.stringify({
      legalEntity: deterministicFacts.legalEntity,
      legalEntityType: deterministicFacts.legalEntityType,
      owners: deterministicFacts.owners,
      address: deterministicFacts.address,
      contact: deterministicFacts.contact,
      shippingRegions: deterministicFacts.shippingRegions,
      languageGermanLikely: deterministicFacts.languageGermanLikely,
      exclusionSignals: deterministicFacts.exclusionSignals,
      socialMedia: deterministicFacts.socialMedia,
      notes: deterministicFacts.notes,
    }, null, 2),
    "",
    "## Verfügbare Kategorien (nur diese verwenden!)",
    JSON.stringify(availableCategories),
    "",
    `## Shop-URL: ${shopUrl}`,
    "",
    `## Shop-Seiten (${pages.length} Seiten)`,
    JSON.stringify(pagesJson),
    "",
    ...(externalContext.length > 0
      ? [
          "## Externe Recherche-Ergebnisse",
          "Die folgenden Snippets stammen aus externen Quellen (nicht von der Shop-Website).",
          "Nutze sie als zusätzliche Evidenz bei der Kriterien-Bewertung, insbesondere für:",
          "- Konzernzugehörigkeit (notLargeCorp)",
          "- Dropshipping-Verdacht (notDropshipping)",
          "- Rechtsextremistische Bezüge (noFarRight)",
          "",
          ...externalContext.map((ctx) => `Query: ${ctx.query}\n${ctx.snippets.map((s) => `  - ${s}`).join("\n")}`),
          "",
        ]
      : []),
    "## Antwortformat",
    "Antworte ausschließlich als JSON mit exakt dieser Struktur:",
    "{",
    '  "extractedFacts": {',
    '    "legalEntity": "Firmenname/Unternehmensname (z.B. \'Cochemer Kaffeerösterei\') – NICHT der Name des Inhabers oder Geschäftsführers. null wenn kein Firmenname erkennbar.",',
    '    "legalEntityType": "GmbH|UG|AG|GbR|OHG|KG|e.K.|Einzelunternehmen|LLC|Ltd oder null",',
    '    "owners": ["Vorname Nachname des Inhabers/Geschäftsführers – NICHT der Firmenname"],',
    '    "street": "Straße Nr oder null",',
    '    "postalCode": "PLZ oder null",',
    '    "city": "Stadt oder null",',
    '    "state": "Bundesland oder null",',
    '    "countryCode": "DE|AT|CH oder null",',
    '    "emails": ["email@example.com"],',
    '    "phones": ["+49..."],',
    '    "shippingRegions": ["DE","AT","CH","EU","WORLD"],',
    '    "languageGermanLikely": true/false,',
    '    "exclusionSignals": ["marketplace","dropshipping","affiliate","chain_or_department_store"],',
    '    "socialMedia": { "instagram": "url", "facebook": "url", ... },',
    '    "affiliateInfoUrl": "URL zur Affiliate-/Partnerprogramm-Seite oder null (z.B. /affiliate, /partnerprogramm, /partner)",',
    '    "notes": {',
    '      "focus": ["Hauptthemen/Schwerpunkte des Shops"],',
    '      "brandsOrProducts": ["konkrete Marken oder Produktlinien"],',
    '      "companyPresentation": "Kurze, sachliche Zusammenfassung der Selbstdarstellung des Unternehmens (2-4 Sätze). Was sagt das Unternehmen über sich selbst? Mission, Geschichte, Werte - nur was auf der Website steht. Kein Rohtext, sondern sauber formuliert. null wenn nichts Brauchbares vorhanden."',
    '    },',
    '    "evidence": [{ "field": "...", "value": "...", "url": "...", "snippet": "...", "confidence": 0.0-1.0 }]',
    "  },",
    '  "criteria": [',
    '    { "key": "independent", "result": "\u2713|\u2717|~", "note": "Begründung" },',
    '    { "key": "german", "result": "\u2713|\u2717|~", "note": "Begründung" },',
    "    ...",
    "  ],",
    '  "categories": ["Kategorie1", "Kategorie2"],',
    '  "verdict": "accept|reject",',
    '  "unclearPoints": ["Beschreibung unklarer Punkte"]',
    "}",
    "",
    "Erfinde NICHTS. Nur was aus den Seiten belegbar ist.",
  ].join("\n");
}

function parseCriteria(raw: LlmAnalysisPayload): CriterionResult[] {
  const results: CriterionResult[] = [];
  const rawCriteria = raw.criteria ?? [];

  for (const key of CRITERION_KEYS) {
    const found = rawCriteria.find((c) => c.key === key);
    const result = found?.result === "\u2713" ? "\u2713" : found?.result === "\u2717" ? "\u2717" : "~";
    results.push({
      key,
      label: CRITERION_LABELS[key] ?? key,
      result,
      note: found?.note ?? "Keine Bewertung vom LLM erhalten.",
    });
  }

  return results;
}

function extractFactsPatch(parsed: LlmAnalysisPayload): Partial<ExtractedFacts> {
  const extracted = parsed.extractedFacts ?? {};
  return {
    legalEntity: extracted.legalEntity ?? null,
    legalEntityType: extracted.legalEntityType ?? null,
    owners: uniqueStrings(extracted.owners),
    address: {
      street: extracted.street ?? null,
      postalCode: extracted.postalCode ?? null,
      city: extracted.city ?? null,
      state: extracted.state ?? null,
      countryCode: extracted.countryCode ?? null,
      sourceUrl: null,
    },
    contact: {
      emails: uniqueStrings(extracted.emails),
      phones: uniqueStrings(extracted.phones),
    },
    shippingRegions: Array.isArray(extracted.shippingRegions) ? extracted.shippingRegions : [],
    languageGermanLikely: Boolean(extracted.languageGermanLikely),
    exclusionSignals: uniqueStrings(extracted.exclusionSignals),
    socialMedia: extracted.socialMedia,
    affiliateInfoUrl: extracted.affiliateInfoUrl ?? null,
    notes: extracted.notes,
    evidence: Array.isArray(extracted.evidence)
      ? extracted.evidence
          .filter((e) => e && typeof e.field === "string" && typeof e.url === "string")
          .map((e) => ({
            field: e.field,
            value: String(e.value ?? ""),
            url: e.url,
            snippet: String(e.snippet ?? "").slice(0, 300),
            confidence: Number.isFinite(e.confidence) ? Number(e.confidence) : 0.55,
          }))
      : [],
  };
}

/** Merge two fact patches. `b` fills gaps left by `a`. Arrays are unioned. */
function mergeFactsPatches(a: Partial<ExtractedFacts>, b: Partial<ExtractedFacts>): Partial<ExtractedFacts> {
  return {
    legalEntity: a.legalEntity ?? b.legalEntity ?? null,
    legalEntityType: a.legalEntityType ?? b.legalEntityType ?? null,
    owners: uniqueStrings([...(a.owners ?? []), ...(b.owners ?? [])]),
    address: {
      street: a.address?.street ?? b.address?.street ?? null,
      postalCode: a.address?.postalCode ?? b.address?.postalCode ?? null,
      city: a.address?.city ?? b.address?.city ?? null,
      state: a.address?.state ?? b.address?.state ?? null,
      countryCode: a.address?.countryCode ?? b.address?.countryCode ?? null,
      sourceUrl: a.address?.sourceUrl ?? b.address?.sourceUrl ?? null,
    },
    contact: {
      emails: uniqueStrings([...(a.contact?.emails ?? []), ...(b.contact?.emails ?? [])]),
      phones: uniqueStrings([...(a.contact?.phones ?? []), ...(b.contact?.phones ?? [])]),
    },
    shippingRegions: normalizeShipping([...(a.shippingRegions ?? []), ...(b.shippingRegions ?? [])]),
    languageGermanLikely: Boolean(a.languageGermanLikely) || Boolean(b.languageGermanLikely),
    exclusionSignals: uniqueStrings([...(a.exclusionSignals ?? []), ...(b.exclusionSignals ?? [])]),
    socialMedia: {
      mastodon: a.socialMedia?.mastodon ?? b.socialMedia?.mastodon ?? null,
      bluesky: a.socialMedia?.bluesky ?? b.socialMedia?.bluesky ?? null,
      twitter: a.socialMedia?.twitter ?? b.socialMedia?.twitter ?? null,
      instagram: a.socialMedia?.instagram ?? b.socialMedia?.instagram ?? null,
      tiktok: a.socialMedia?.tiktok ?? b.socialMedia?.tiktok ?? null,
      youtube: a.socialMedia?.youtube ?? b.socialMedia?.youtube ?? null,
      twitch: a.socialMedia?.twitch ?? b.socialMedia?.twitch ?? null,
      pinterest: a.socialMedia?.pinterest ?? b.socialMedia?.pinterest ?? null,
      linkedin: a.socialMedia?.linkedin ?? b.socialMedia?.linkedin ?? null,
      facebook: a.socialMedia?.facebook ?? b.socialMedia?.facebook ?? null,
      threads: a.socialMedia?.threads ?? b.socialMedia?.threads ?? null,
      patreon: a.socialMedia?.patreon ?? b.socialMedia?.patreon ?? null,
    },
    affiliateInfoUrl: a.affiliateInfoUrl ?? b.affiliateInfoUrl ?? null,
    notes: {
      focus: uniqueStrings([...(a.notes?.focus ?? []), ...(b.notes?.focus ?? [])]),
      brandsOrProducts: uniqueStrings([...(a.notes?.brandsOrProducts ?? []), ...(b.notes?.brandsOrProducts ?? [])]),
      companyPresentation: a.notes?.companyPresentation ?? b.notes?.companyPresentation ?? null,
    },
    evidence: [...(a.evidence ?? []), ...(b.evidence ?? [])],
  };
}

/** Merge criteria from multiple chunks. Worst result wins (X > ~ > V). */
function mergeCriteria(all: CriterionResult[][]): CriterionResult[] {
  const worst = (a: "\u2713" | "\u2717" | "~", b: "\u2713" | "\u2717" | "~"): "\u2713" | "\u2717" | "~" => {
    if (a === "\u2717" || b === "\u2717") return "\u2717";
    if (a === "~" || b === "~") return "~";
    return "\u2713";
  };

  return CRITERION_KEYS.map((key) => {
    let result: "\u2713" | "\u2717" | "~" = "\u2713";
    let note = "";
    for (const criteria of all) {
      const found = criteria.find((c) => c.key === key);
      if (found) {
        result = worst(result, found.result);
        if (found.note && found.note !== "Keine Bewertung vom LLM erhalten.") note = found.note;
      }
    }
    return { key, label: CRITERION_LABELS[key] ?? key, result, note: note || "Keine Bewertung vom LLM erhalten." };
  });
}

function snippetForLog(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 300);
}

async function runSingleAnalysis(
  prompt: string,
  onParseFailure?: (message: string) => void,
): Promise<LlmAnalysisPayload | null> {
  const raw = await llmGenerate({
    prompt,
    task: "extraction",
    temperature: TEMPERATURE_EXTRACTION,
  });
  const parsed = tryParseJson<LlmAnalysisPayload>(raw);
  if (parsed) return parsed;
  onParseFailure?.(`Initial raw output snippet: ${snippetForLog(raw)}`);

  // Single retry
  const retry = await llmGenerate({
    prompt,
    task: "extraction",
    temperature: TEMPERATURE_EXTRACTION,
  });
  const retried = tryParseJson<LlmAnalysisPayload>(retry);
  if (retried) return retried;
  onParseFailure?.(`Retry raw output snippet: ${snippetForLog(retry)}`);
  return null;
}

export async function analyzeShopWithLlm({
  shopUrl,
  pages,
  deterministicFacts,
  availableCategories,
  admissionCriteriaText = "",
  externalContext = [],
  onProgress,
}: {
  shopUrl: string;
  pages: FetchedPage[];
  deterministicFacts: ExtractedFacts;
  availableCategories: string[];
  admissionCriteriaText?: string;
  externalContext?: ExternalContext[];
  onProgress?: (message: string) => void;
}): Promise<CombinedAnalysisResult> {
  const fallbackDecision: DecisionOutcome = {
    criteria: CRITERION_KEYS.map((key) => ({
      key,
      label: CRITERION_LABELS[key] ?? key,
      result: "~" as const,
      note: "LLM-Analyse fehlgeschlagen.",
    })),
    verdict: "reject",
    unclearPoints: Object.values(CRITERION_LABELS),
  };

  if (!pages.length) {
    return { factsPatch: {}, decision: fallbackDecision, categories: [] };
  }

  const relevantPages = selectRelevantPages(pages);
  onProgress?.(`Selected ${relevantPages.length} relevant pages from ${pages.length} total for LLM analysis.`);
  const chunks = chunkPages(relevantPages);
  onProgress?.(`Analyzing ${relevantPages.length} pages in ${chunks.length} chunk(s)...`);

  let mergedFacts: Partial<ExtractedFacts> = {};
  const allCriteria: CriterionResult[][] = [];
  let allCategories: string[] = [];
  let lastVerdict: string | undefined;
  let allUnclearPoints: string[] = [];
  let anySuccess = false;

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const chunkInfo = chunks.length > 1 ? { current: i + 1, total: chunks.length } : undefined;
    const prompt = buildAnalysisPrompt(shopUrl, chunk, deterministicFacts, availableCategories, admissionCriteriaText, externalContext, chunkInfo);
    const promptTokens = estimateTokens(prompt);
    onProgress?.(`Chunk ${i + 1}/${chunks.length}: ${chunk.length} pages, ~${promptTokens} tokens...`);

    try {
      const parseFailureLogs: string[] = [];
      const parsed = await runSingleAnalysis(prompt, (message) => {
        parseFailureLogs.push(message);
      });
      if (!parsed) {
        onProgress?.(`Chunk ${i + 1}: LLM response not parseable (even after retry).`);
        for (const message of parseFailureLogs) {
          onProgress?.(`Chunk ${i + 1}: ${message}`);
        }
        continue;
      }

      anySuccess = true;
      mergedFacts = mergeFactsPatches(mergedFacts, extractFactsPatch(parsed));
      allCriteria.push(parseCriteria(parsed));
      allCategories = uniqueStrings([...allCategories, ...uniqueStrings(parsed.categories)]);
      if (parsed.verdict) lastVerdict = parsed.verdict;
      allUnclearPoints = uniqueStrings([...allUnclearPoints, ...uniqueStrings(parsed.unclearPoints)]);
    } catch (error) {
      if (error instanceof LlmFatalError) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      onProgress?.(`Chunk ${i + 1}: LLM error: ${detail}`);
    }
  }

  if (!anySuccess) {
    return { factsPatch: {}, decision: fallbackDecision, categories: [] };
  }

  const criteria = allCriteria.length > 0 ? mergeCriteria(allCriteria) : fallbackDecision.criteria;
  const hasExclusion = criteria.some((c) => c.result === "\u2717");
  const requiredMet = ["independent", "shipping"].every(
    (key) => criteria.find((c) => c.key === key)?.result === "\u2713",
  );
  const computedVerdict: "accept" | "reject" = !hasExclusion && requiredMet ? "accept" : "reject";
  const verdict: "accept" | "reject" = lastVerdict === "accept" || lastVerdict === "reject" ? lastVerdict : computedVerdict;
  const unclearPoints = allUnclearPoints.length > 0 ? allUnclearPoints : criteria.filter((c) => c.result === "~").map((c) => c.label);

  const allowedCategories = new Set(availableCategories);
  const categories = allCategories.filter((c) => allowedCategories.has(c));

  return {
    factsPatch: mergedFacts,
    decision: { criteria, verdict, unclearPoints },
    categories,
  };
}
