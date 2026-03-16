import { analyzeShopWithLlm } from "./analyze";
import type { DecisionOutcome } from "./decision";
import type { ExtractedFacts } from "./extract";
import { geocodeWithFallback, type GeoResult } from "./geocode";
import type { RejectionMarkdown, ShopJson } from "./output";
import type { FetchedPage } from "./research";
import { searchExternalContext, searchSocialMedia } from "./web-search";
import { SHOPCHECK_USER_AGENT } from "../constants";
import { tryParseJson } from "../lib/utils";
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
  fallbackLevel: "none",
  resolvedState: null,
  resolvedCountryCode: null,
  resolvedCity: null,
};

const REJECTION_LINK_BLOCK = [
  "Die vollständige Begründung finden Sie unter:",
  "https://lmaa.space/rejected/[REJECT_TOKEN]",
].join("\n");

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

function renderCriteriaTable(decision: DecisionOutcome): string {
  const lines = [
    "| Kriterium | Ergebnis | Anmerkung |",
    "| --- | --- | --- |",
  ];
  for (const criterion of decision.criteria) {
    lines.push(`| ${criterion.label} | ${criterion.result} | ${criterion.note} |`);
  }
  return lines.join("\n");
}

function buildAcceptanceJsonSkeleton(input: {
  shopName: string;
  shopUrl: string;
  facts: ExtractedFacts;
  geo: GeoResult;
  categories: string[];
}): ShopJson {
  return {
    name: input.shopName,
    url: input.shopUrl,
    description: "Hier die finale Shopbeschreibung einsetzen.",
    categories: input.categories,
    contactEmail: input.facts.contact.emails[0] ?? null,
    shippingRegions: input.facts.shippingRegions,
    legal: {
      entityName: input.facts.legalEntity,
      entityType: input.facts.legalEntityType,
      owners: input.facts.owners,
      headquartersSource: input.facts.address.sourceUrl,
    },
    headquarters: {
      street: input.facts.address.street,
      postalCode: input.facts.address.postalCode,
      city: input.facts.address.city,
      state: input.facts.address.state,
      countryCode: input.facts.address.countryCode,
    },
    geo: {
      latitude: input.geo.latitude,
      longitude: input.geo.longitude,
    },
    socialMedia: input.facts.socialMedia,
    affiliate: {
      infoUrl: input.facts.affiliateInfoUrl,
    },
    notes: {
      focus: input.facts.notes.focus,
      brandsOrProducts: input.facts.notes.brandsOrProducts,
      companyPresentation: input.facts.notes.companyPresentation,
    },
  };
}

function buildFinalOutputPrompt(input: {
  shopName: string;
  shopUrl: string;
  decision: DecisionOutcome;
  facts: ExtractedFacts;
  geo: GeoResult;
  categories: string[];
  pageTexts: Array<{ url: string; text: string }>;
}): string {
  const preparedJson = buildAcceptanceJsonSkeleton(input);
  const pageContext = input.pageTexts
    .slice(0, 5)
    .map((page) => `[${page.url}]\n${page.text.slice(0, 2200)}`)
    .join("\n\n---\n\n");

  return [
    "Du führst den finalen Output strikt nach dem Skill lmaa-shop-check aus.",
    "Verwende die Skill-Vorgaben für Struktur, Sprache und Ausgabeformat so nah wie möglich 1:1.",
    "Der Provider ist austauschbar. Prompt, Regeln und Ausgabeformat bleiben gleich.",
    "Das Prüfergebnis ist bereits entschieden und darf nicht neu bewertet werden.",
    "",
    "## Shop",
    `Name: ${input.shopName}`,
    `URL: ${input.shopUrl}`,
    "",
    "## Bereits entschiedene Prüfung",
    JSON.stringify(input.decision, null, 2),
    "",
    "## Verifizierte Fakten",
    JSON.stringify({
      legalEntity: input.facts.legalEntity,
      legalEntityType: input.facts.legalEntityType,
      owners: input.facts.owners,
      address: input.facts.address,
      contact: input.facts.contact,
      shippingRegions: input.facts.shippingRegions,
      socialMedia: input.facts.socialMedia,
      affiliateInfoUrl: input.facts.affiliateInfoUrl,
      notes: input.facts.notes,
      evidence: input.facts.evidence.slice(0, 15),
      geo: input.geo,
      categories: input.categories,
    }, null, 2),
    "",
    "## Relevante Quellseiten",
    pageContext,
    "",
    "## Verbindliche Skill-Vorgaben für den finalen Output",
    "Always return a complete, structured result.",
    "",
    "### Header",
    "```md",
    `### Shop-Prüfung: ${input.shopName}`,
    "",
    `**URL:** ${input.shopUrl}`,
    "```",
    "",
    "### Criteria Checklist",
    "```md",
    renderCriteriaTable(input.decision),
    "```",
    "",
    "### Verdict",
    input.decision.verdict === "accept" ? "**✅ Aufnahme empfohlen**" : "**❌ Ablehnung empfohlen**",
    "",
    ...(input.decision.verdict === "reject"
      ? [
          "### Rejection Output",
          "Directly below the verdict, output two code blocks:",
          "- Short reason for dashboard field Kommentar",
          "- 2 to 3 sentences why the shop should be rejected and why it does not fit the acceptance criteria",
          "- State the main rejection reason clearly",
          "- If facts are stated, place footnotes directly in the text",
          "- Add a block-local source list at the end",
          "- Do not mention lmaa.space in the description; keep the sentences neutral.",
          "- Always end with this text in a separate line surrounded by newlines:",
          REJECTION_LINK_BLOCK,
          "",
          "- Long reason for Langbegründung (öffentliche Seite)",
          "- 300 to 500 words",
          "- Structure: ## Einleitung, ## Ablehnungsgründe, ### Unterabschnitte je Grund, ## Schluss",
          "- Neutral, factual, no speculation",
          "- Use inline footnote markers",
          "- Add a complete source list at the end of the same block, Format of a source: URL, Stand: $DATUM",
        ]
      : [
          "### Acceptance Output",
          "- Shop description as Markdown in a code block",
          "- Brief information about the shop and its legal form",
          "- For better search results, also mention a few brands and products from the portfolio",
          "- Information about workshops, courses or similar events is interesting when evidenced",
          "- Information about company history, origins, and amusing or interesting anecdotes is interesting when evidenced",
          "- Use paragraphs for thematic separation",
          "- No sources or footnotes in this block",
          "- Do not mention lmaa.space in the description; keep the sentences neutral",
          "- The description must be a newly written shop portrait and must not copy or closely paraphrase notes.companyPresentation",
          "- Integrate legal form, owners, location, focus, products and shipping naturally into the prose when evidenced",
          "",
          "- Categories as a comma-separated list in a code block",
          "- Social profiles as separate headings with one code block per cleaned URL",
          "- Contact email in a separate code block",
          "- Structured JSON in a final code block for direct copy/import",
          "- Output this JSON block last in the acceptance section",
          "- The JSON must include all gathered acceptance data",
          "- Use this exact JSON structure as the final block and replace description with the full final shop description from the Markdown description block:",
          "```json",
          JSON.stringify(preparedJson, null, 2),
          "```",
          "",
          "The Markdown shop description and the JSON field description must contain the same final shop description text.",
        ]),
    "",
    "## Weitere Skill-Regeln",
    "- Final user-facing texts must be in German.",
    "- In all published German texts, always use real German umlauts (ä, ö, ü, Ä, Ö, Ü) and sharp s (ß, ẞ).",
    "- Do not use Em-dashes.",
    "- When lmaa.space appears in prose, italicize it.",
    "- Always bold the shop name in generated texts.",
    "- Use only evidenced facts from the verified facts and source pages.",
    "- Exception for acceptance: description, categories, contact email, and social URL blocks stay source-free so they can be copied directly.",
    "- Keep notes.companyPresentation as a short factual note. It is not the final description.",
    "",
    "Gib nur den finalen Output zurück. Keine Vorbemerkung. Keine Erklärung außerhalb des Skill-Outputs.",
  ].join("\n");
}

async function generateFinalOutput(prompt: string): Promise<string> {
  let response = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: 0.2,
    });
    if (response.includes("### Shop-Prüfung:") && response.includes("**URL:**")) {
      return response;
    }
  }
  return response;
}

function parseShopJsonFromResponse(text: string): ShopJson | null {
  const jsonBlocks = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  if (jsonBlocks.length > 0) {
    const lastBlock = jsonBlocks[jsonBlocks.length - 1][1];
    const parsed = tryParseJson<ShopJson>(lastBlock);
    if (parsed) return parsed;
  }
  return tryParseJson<ShopJson>(text);
}

function parseRejectionMarkdownFromResponse(text: string): RejectionMarkdown | null {
  const shortMatch = text.match(/## Kurzbegründung\s*\n\s*```(?:md|markdown)?\s*\n([\s\S]*?)\n```/i);
  const longMatch = text.match(/## Langbegründung\s*\n\s*```(?:md|markdown)?\s*\n([\s\S]*?)\n```/i);
  if (shortMatch?.[1] && longMatch?.[1]) {
    const shortReason = shortMatch[1].trim();
    const longReason = longMatch[1].trim();
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

  const codeBlocks = [...text.matchAll(/```(?:md|markdown)?\s*\n([\s\S]*?)\n```/g)].map((match) => match[1].trim());
  if (codeBlocks.length >= 2) {
    return {
      shortReason: codeBlocks[0],
      longReason: codeBlocks[1],
      markdown: [
        text.match(/^### Shop-Prüfung:[\s\S]*?\*\*URL:\*\* .+$/m)?.[0] ?? "",
        "",
        "## Kurzbegründung",
        "",
        codeBlocks[0],
        "",
        "## Langbegründung",
        "",
        codeBlocks[1],
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

  const fullResponse = await generateFinalOutput(buildFinalOutputPrompt({
    shopName,
    shopUrl,
    decision: analysis.decision,
    facts: mergedFacts,
    geo,
    categories: analysis.categories,
    pageTexts: preCrawledPages.map((page) => ({ url: page.url, text: page.text })),
  }));
  const shopJson = analysis.decision.verdict === "accept" ? parseShopJsonFromResponse(fullResponse) : null;
  const rejectionMarkdown = analysis.decision.verdict === "reject" ? parseRejectionMarkdownFromResponse(fullResponse) : null;

  onProgress?.("Auswertung abgeschlossen.");

  return {
    shopName: shopJson?.name ?? shopName,
    shopUrl,
    verdict: analysis.decision.verdict,
    shopJson,
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
