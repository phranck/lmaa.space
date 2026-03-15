import Anthropic from "@anthropic-ai/sdk";

import { analyzeShopWithLlm } from "./analyze";
import type { DecisionOutcome } from "./decision";
import type { ExtractedFacts } from "./extract";
import { geocodeWithFallback, type GeoResult } from "./geocode";
import { buildShopJson, type ShopJson } from "./output";
import { extractMainContent, type FetchedPage } from "./research";
import { searchExternalContext, searchSocialMedia } from "./web-search";
import { SHOPCHECK_USER_AGENT, TIMEOUT_PAGE_MS } from "../constants";
import { tryParseJson } from "../lib/utils";
import { LlmFatalError, getLlmProvider } from "../llm/client";

const MAX_AGENT_TURNS = 50;
const AGENT_MODEL = "claude-sonnet-4-20250514";
const AGENT_MAX_TOKENS = 16384;
const PAGE_TEXT_LIMIT = 25000;
const MAX_WEB_SEARCHES = 15;

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
  fallbackLevel: "none",
  resolvedState: null,
  resolvedCountryCode: null,
  resolvedCity: null,
};

const AGENT_TOOLS: Anthropic.Messages.ToolUnion[] = [
  {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: MAX_WEB_SEARCHES,
  },
  {
    name: "fetch_page",
    description:
      "Fetch a web page and return its main text content (HTML tags stripped). " +
      "Use this to read additional pages not included in the pre-crawled content.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "The full URL to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "geocode",
    description:
      "Geocode an address to latitude/longitude. Uses Nominatim + Photon with automatic fallback cascade.",
    input_schema: {
      type: "object" as const,
      properties: {
        street: { type: "string", description: "Street and house number" },
        postalCode: { type: "string", description: "Postal code" },
        city: { type: "string", description: "City name" },
        countryCode: { type: "string", description: "ISO 3166-1 alpha-2 country code (e.g. DE, AT, CH)" },
      },
      required: [],
    },
  },
];

async function fetchPageImpl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_PAGE_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": SHOPCHECK_USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain",
      },
    });
    if (!res.ok) return `Error: HTTP ${res.status}`;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return `Error: Unsupported content type: ${contentType}`;
    }
    const html = await res.text();
    const text = extractMainContent(html);
    return text.slice(0, PAGE_TEXT_LIMIT);
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeImpl(params: {
  street?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
}): Promise<string> {
  const result = await geocodeWithFallback({
    street: params.street ?? null,
    postalCode: params.postalCode ?? null,
    city: params.city ?? null,
    countryCode: params.countryCode ?? null,
    userAgent: SHOPCHECK_USER_AGENT,
  });
  return JSON.stringify({
    latitude: result.latitude,
    longitude: result.longitude,
    source: result.source,
    resolvedState: result.resolvedState,
    resolvedCountryCode: result.resolvedCountryCode,
    resolvedCity: result.resolvedCity,
  });
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "fetch_page":
      return fetchPageImpl(String(input.url ?? ""));
    case "geocode":
      return geocodeImpl(input as { street?: string; postalCode?: string; city?: string; countryCode?: string });
    default:
      return `Unknown tool: ${name}`;
  }
}

function buildSystemPrompt(admissionCriteriaText: string, categories: string[]): string {
  return [
    "Du bist ein Experte für die Bewertung von Online-Shops für das Verzeichnis lmaa.space.",
    "Du erhältst vorgecrawlte Shop-Seiten und deterministisch extrahierte Fakten.",
    "Deine Aufgabe: Alle Informationen gründlich analysieren und ein strukturiertes Ergebnis liefern.",
    "",
    "## Verfügbare Tools",
    "- web_search: Echte Websuche (Server-seitig). Nutze sie gezielt und sparsam.",
    "- fetch_page(url): Lade zusätzliche Webseiten falls nötig.",
    "- geocode(street, postalCode, city, countryCode): Geokodiere eine Adresse zu Koordinaten.",
    "",
    "WICHTIG: Die Shop-Seiten sind bereits vorgecrawlt und in der User-Nachricht enthalten!",
    "Du musst die Shop-Seiten NICHT nochmal fetchen. Nutze fetch_page nur für Seiten die fehlen.",
    "",
    "## Token-Effizienz bei Websuchen",
    "- Analysiere ZUERST alle vorgecrawlten Seiten gründlich, BEVOR du suchst.",
    "- Fasse Recherchebedürfnisse zusammen und suche gezielt statt einzeln pro Plattform.",
    "  Beispiel: \"Shopname Instagram Facebook YouTube TikTok\" statt 4 einzelne Suchen.",
    "- Nutze fetch_page für bekannte URLs statt web_search (z.B. wenn du eine Social-URL in den Seiten findest).",
    "- Stoppe die Recherche sobald genug Informationen vorliegen.",
    `- Maximum ${MAX_WEB_SEARCHES} Websuchen verfügbar. Teile sie strategisch ein:`,
    "  - 1-2 für fehlende Kerninfos (Impressum, Versand)",
    "  - 2-3 für Social-Media-Profile (kombinierte Suchen)",
    "  - 2-3 für Ausschlusskriterien (Konzern, Dropshipping, Rechtsextremismus)",
    "  - Rest für Lücken",
    "",
    "## Analyse-Workflow",
    "",
    "### 1. Vorgecrawlte Seiten analysieren",
    "Lies ALLE vorgecrawlten Seiten gründlich durch und extrahiere:",
    "- Shop-Name, Produktfokus, Sprache",
    "- Rechtsform, Firmenname, Inhaber/Geschäftsführer (volle Namen)",
    "- Vollständige Adresse (Straße, PLZ, Ort, Bundesland, Land)",
    "- Kontakt-E-Mail, Telefonnummern",
    "- Versandregionen (DE, AT, CH, EU, WORLD)",
    "- Social-Media-Links",
    "- Sortiment-Fokus, konkrete Marken, Eigenmarken, Produktlinien",
    "- Gründungsjahr, Gründungsgeschichte, Mission, Besonderheiten",
    "- Zertifizierungen, Auszeichnungen, Nachhaltigkeitsaspekte",
    "- Affiliate-/Partnerprogramm-URL",
    "",
    "### 2. Fehlende Shop-Seiten nachholen",
    "Falls wichtige Seiten in den vorgecrawlten Daten fehlen (z.B. kein Impressum, keine Versandseite),",
    "versuche diese mit fetch_page direkt zu laden. Typische URLs:",
    "- /impressum, /imprint, /legal",
    "- /versand, /shipping, /lieferung",
    "- /ueber-uns, /about, /about-us",
    "- /kontakt, /contact",
    "",
    "### 3. Gezielte externe Recherche (web_search)",
    "Suche NUR nach Informationen die aus den vorgecrawlten Seiten NICHT hervorgehen:",
    "- Fehlende Social-Media-Profile (kombinierte Suche)",
    "- Konzernzugehörigkeit / Unternehmenshintergrund",
    "- Ausschlusskriterien (Dropshipping, Rechtsextremismus)",
    "- Gründungsgeschichte falls nicht auf der Website",
    "",
    "### 4. Kriterien bewerten",
    "Bewerte JEDES der 9 Kriterien mit ✓, ✗ oder ~.",
    "Schreibe zu JEDEM eine ausführliche Begründung (2-4 Sätze) mit konkreten Belegen.",
    "",
    "### 5. Für Aufnahme-Kandidaten",
    "- Geokodiere die Adresse mit dem geocode-Tool",
    "- Schreibe eine deutsche Shop-Beschreibung",
    "- Ordne Kategorien zu",
    "",
    "## Aufnahmekriterien",
    admissionCriteriaText || "(Kriterien konnten nicht geladen werden)",
    "",
    "## 9 Prüfkriterien",
    "",
    "- **independent**: Eigenständiger Online-Auftritt. Eigene Domain = ✓. Shopify/WooCommerce auf eigener Domain = ✓.",
    "- **german**: Deutschsprachiges Angebot. Deutsche Texte = ✓. Rein englisch = ✗.",
    "- **shipping**: Versand in DACH/EU/weltweit. DE oder AT = automatisch EU. ✓ wenn Versand nach DE oder AT.",
    "- **notLargeCorp**: Kein Großkonzern. KMU/Familienunternehmen = ✓. Nutze externe Recherche!",
    "- **notMarketplace**: Keine Multi-Vendor-Plattform. Normaler Shop mit verschiedenen Marken = ✓.",
    "- **notDropshipping**: Kein reines Dropshipping. Eigene Produktion/Lager/Wareneinkauf = ✓.",
    "- **notChain**: Kein Filialist (>10 Filialen = ✗). 1-5 Standorte + Online-Shop = ✓.",
    "- **notAffiliate**: Kein reines Affiliate-Portal. Eigener Checkout = ✓.",
    "- **noFarRight**: Kein rechtsextremistischer Bezug. Ohne Evidenz = ✓. Nutze externe Recherche!",
    "",
    "Entscheidung: Mindestens ein ✗ → Ablehnung. Alle Pflicht (independent, german, shipping) ✓ + kein ✗ → Aufnahme.",
    "Im Zweifel für den Shop.",
    "",
    "## Verfügbare Kategorien",
    JSON.stringify(categories),
    "",
    "## Versandregionen normalisieren",
    "- WORLD wenn weltweit belegt → nur [\"WORLD\"]",
    "- EU wenn europaweit belegt → nur [\"EU\"]",
    "- Sonst nur konkrete DACH-Codes: [\"DE\"], [\"AT\"], [\"CH\"] oder Kombination",
    "",
    "## Beschreibungs-Richtlinien",
    "- Deutsch, echte Umlaute (ä, ö, ü, ß), keine Em-Dashes",
    "- Journalistisch, interessant, nicht bürokratisch",
    "- Beginne mit dem Besonderen des Shops",
    "- Inhalt: Mission/Geschichte, Sortiment, konkrete Marken, Herstellung, Zertifizierungen, Versand",
    "- Shop-Name beim ERSTEN Auftreten fett: **Shopname**",
    "- Keine Füllwörter: kontinuierlich, ständig, stets, umfassend, vielfältig",
    "- Keine Meta-Aussagen über die Website, kein Newsletter/Datenschutz/AGB",
    "- Min 1000 Zeichen, ideal 1500-2500, Absätze mit \\n\\n",
    "- lmaa.space nicht erwähnen",
    "",
    "## Ausgabeformat",
    "",
    "Gib am Ende deiner Analyse das Ergebnis als JSON in einem ```json Code-Block aus:",
    "",
    "```json",
    "{",
    '  "name": "Shop Name",',
    '  "url": "https://example.com",',
    '  "description": "Deutsche Beschreibung...",',
    '  "categories": ["Kategorie A"],',
    '  "contactEmail": "info@example.com",',
    '  "shippingRegions": ["EU"],',
    '  "legal": { "entityName": "Firma GmbH", "entityType": "GmbH", "owners": ["Max Muster"], "headquartersSource": "Impressum" },',
    '  "headquarters": { "street": "Str. 1", "postalCode": "12345", "city": "Ort", "state": "Land", "countryCode": "DE" },',
    '  "geo": { "latitude": 52.52, "longitude": 13.405 },',
    '  "socialMedia": { "mastodon": null, "bluesky": null, "twitter": null, "instagram": null, "tiktok": null, "youtube": null, "twitch": null, "pinterest": null, "linkedin": null, "facebook": null, "threads": null, "patreon": null },',
    '  "affiliate": { "infoUrl": null },',
    '  "notes": { "focus": ["..."], "brandsOrProducts": ["..."], "companyPresentation": "Ausführlich (4-8 Sätze)..." }',
    "}",
    "```",
    "",
    "Vor dem JSON: Kriterien-Tabelle + Verdikt:",
    "| Kriterium | Ergebnis | Anmerkung |",
    "| --- | --- | --- |",
    "| ... | ✓/✗/~ | Begründung |",
    "",
    "**Verdikt: ✅ Aufnahme empfohlen** oder **Verdikt: ❌ Ablehnung empfohlen**",
    "",
    "WICHTIG: Erfinde NICHTS. Nur was belegbar ist. Sei GRÜNDLICH.",
  ].join("\n");
}

function buildUserMessage(
  shopUrl: string,
  shopName: string,
  pages: FetchedPage[],
  facts: ExtractedFacts,
): string {
  const pagesSummary = pages
    .map((p) => `### ${p.url}\n${p.text.slice(0, 12000)}`)
    .join("\n\n---\n\n");

  const factsJson = JSON.stringify(
    {
      legalEntity: facts.legalEntity,
      legalEntityType: facts.legalEntityType,
      owners: facts.owners,
      address: facts.address,
      contact: facts.contact,
      shippingRegions: facts.shippingRegions,
      languageGermanLikely: facts.languageGermanLikely,
      socialMedia: facts.socialMedia,
      affiliateInfoUrl: facts.affiliateInfoUrl,
      exclusionSignals: facts.exclusionSignals,
      notes: facts.notes,
    },
    null,
    2,
  );

  return [
    `## Shop-Prüfung: ${shopName}`,
    `**URL:** ${shopUrl}`,
    "",
    `## Vorgecrawlte Seiten (${pages.length} Seiten)`,
    "",
    pagesSummary,
    "",
    "## Deterministisch extrahierte Fakten",
    "Diese Fakten wurden bereits per Regex/Heuristik aus den Seiten extrahiert.",
    "Nutze sie als Ausgangsbasis, aber prüfe und ergänze sie anhand der Seitentexte oben.",
    "",
    factsJson,
    "",
    "## Deine Aufgabe",
    "1. Analysiere ALLE vorgecrawlten Seiten gründlich",
    "2. Ergänze fehlende Informationen (fetch_page für fehlende Seiten, web_search für externe Recherche)",
    "3. Suche Social-Media-Profile per web_search (kombiniert, nicht einzeln!)",
    "4. Führe externe Recherche durch (Konzern, Dropshipping, Rechtsextremismus)",
    "5. Bewerte alle 9 Aufnahmekriterien",
    "6. Geokodiere die Adresse (geocode-Tool)",
    "7. Schreibe die Shop-Beschreibung",
    "8. Gib das vollständige JSON aus",
  ].join("\n");
}

function parseShopJsonFromResponse(text: string): ShopJson | null {
  const jsonBlocks = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  if (jsonBlocks.length === 0) return null;
  const lastBlock = jsonBlocks[jsonBlocks.length - 1][1];
  return tryParseJson<ShopJson>(lastBlock);
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

async function runClaudeAgent({
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new LlmFatalError("ANTHROPIC_API_KEY environment variable is not set.");

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(admissionCriteriaText, categories);
  const userMessage = buildUserMessage(shopUrl, shopName, preCrawledPages, preCrawledFacts);
  const cachedSystem: Anthropic.TextBlockParam[] = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];
  const cachedTools: Anthropic.Messages.ToolUnion[] = AGENT_TOOLS.map((tool, i) =>
    i === AGENT_TOOLS.length - 1 ? { ...tool, cache_control: { type: "ephemeral" } } : tool,
  );
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  let turns = 0;
  let finalText = "";
  let customToolCalls = 0;
  let webSearchCalls = 0;

  onProgress?.(`Agent gestartet (Provider: claude, Model: ${AGENT_MODEL}, ${preCrawledPages.length} vorgecrawlte Seiten, web_search: server-side, prompt caching: on)`);

  while (turns < MAX_AGENT_TURNS) {
    turns++;

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: AGENT_MODEL,
        max_tokens: AGENT_MAX_TOKENS,
        system: cachedSystem,
        tools: cachedTools,
        messages,
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        const fatal = error.status === 401 || error.status === 403 || error.status === 402;
        if (fatal) {
          throw new LlmFatalError(`Claude API fatal (${error.status}): ${error.message}`);
        }
        throw new Error(`Claude API error (${error.status}): ${error.message}`);
      }
      throw error;
    }

    messages.push({ role: "assistant", content: response.content });

    for (const block of response.content) {
      if (block.type === "text") finalText += block.text;
      if (block.type === "server_tool_use" && block.name === "web_search") {
        webSearchCalls++;
        onProgress?.(`  [${turns}] web_search (server-side, #${webSearchCalls})`);
      }
    }

    if (response.stop_reason !== "tool_use") {
      onProgress?.(`Agent fertig nach ${turns} Runden (${customToolCalls} custom + ${webSearchCalls} web_search Aufrufe)`);
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      customToolCalls++;
      const input = block.input as Record<string, unknown>;
      const shortInput =
        block.name === "fetch_page"
          ? String(input.url ?? "")
          : JSON.stringify(input).slice(0, 80);
      onProgress?.(`  [${turns}/${customToolCalls}] ${block.name}: ${shortInput}`);

      try {
        const result = await executeTool(block.name, input);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      } catch (err) {
        const errorMsg = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: errorMsg, is_error: true });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  if (turns >= MAX_AGENT_TURNS) {
    onProgress?.(`Agent abgebrochen: Maximum von ${MAX_AGENT_TURNS} Runden erreicht.`);
  }

  const shopJson = parseShopJsonFromResponse(finalText);
  const verdict: "accept" | "reject" = finalText.includes("✅") ? "accept" : "reject";
  const resolvedName = shopJson?.name ?? shopName;

  return {
    shopName: resolvedName,
    shopUrl,
    verdict,
    shopJson,
    fullResponse: finalText,
  };
}

function buildResponseSummary(decision: DecisionOutcome, shopJson: ShopJson | null, categories: string[]): string {
  return JSON.stringify(
    {
      provider: "ollama",
      verdict: decision.verdict,
      unclearPoints: decision.unclearPoints,
      categories,
      hasShopJson: Boolean(shopJson),
    },
    null,
    2,
  );
}

async function runOllamaFlow({
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
  onProgress?.(`Agent gestartet (Provider: ollama, Model: qwen3.5:397b-cloud, ${preCrawledPages.length} vorgecrawlte Seiten)`);

  const externalContext = await searchExternalContext({
    shopName,
    userAgent: SHOPCHECK_USER_AGENT,
    onProgress,
  });

  const analysis = await analyzeShopWithLlm({
    shopUrl,
    pages: preCrawledPages,
    deterministicFacts: preCrawledFacts,
    availableCategories: categories,
    admissionCriteriaText,
    externalContext,
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

  let geo = EMPTY_GEO_RESULT;
  if (analysis.decision.verdict === "accept") {
    geo = await geocodeWithFallback({
      street: mergedFacts.address.street,
      postalCode: mergedFacts.address.postalCode,
      city: mergedFacts.address.city,
      countryCode: mergedFacts.address.countryCode,
      userAgent: SHOPCHECK_USER_AGENT,
    });
  }

  const shopJson = analysis.decision.verdict === "accept"
    ? await buildShopJson({
        shopName,
        shopUrl,
        decision: analysis.decision,
        facts: mergedFacts,
        geo,
        categories: analysis.categories,
        pageTexts: preCrawledPages.map((page) => ({ url: page.url, text: page.text })),
      })
    : null;

  onProgress?.("Ollama-Auswertung abgeschlossen.");

  return {
    shopName: shopJson?.name ?? shopName,
    shopUrl,
    verdict: analysis.decision.verdict,
    shopJson,
    fullResponse: buildResponseSummary(analysis.decision, shopJson, analysis.categories),
  };
}

export type AgentResult = {
  shopName: string;
  shopUrl: string;
  verdict: "accept" | "reject";
  shopJson: ShopJson | null;
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
  return getLlmProvider() === "ollama"
    ? runOllamaFlow({ shopUrl, shopName, preCrawledPages, preCrawledFacts, admissionCriteriaText, categories, onProgress })
    : runClaudeAgent({ shopUrl, shopName, preCrawledPages, preCrawledFacts, admissionCriteriaText, categories, onProgress });
}
