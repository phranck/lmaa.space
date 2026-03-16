import { analyzeShopWithLlm } from "./analyze";
import type { DecisionOutcome } from "./decision";
import type { ExtractedFacts } from "./extract";
import { geocodeWithFallback, type GeoResult } from "./geocode";
import { buildShopJson, type RejectionMarkdown, type ShopJson } from "./output";
import type { FetchedPage } from "./research";
import { searchExternalContext, searchSocialMedia } from "./web-search";
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


function buildRejectionPrompt({
  shopName,
  shopUrl,
  decision,
  facts,
}: {
  shopName: string;
  shopUrl: string;
  decision: DecisionOutcome;
  facts: ExtractedFacts;
}): string {
  return [
    "Verfasse eine strukturierte Ablehnungsbegründung für diesen Online-Shop.",
    "Das Prüfergebnis ist endgültig entschieden und darf nicht neu bewertet werden.",
    "",
    "## Shop",
    `Name: ${shopName}`,
    `URL: ${shopUrl}`,
    "",
    "## Prüfergebnis",
    JSON.stringify(decision, null, 2),
    "",
    "## Verifizierte Fakten",
    JSON.stringify({
      legalEntity: facts.legalEntity,
      legalEntityType: facts.legalEntityType,
      address: facts.address,
      evidence: facts.evidence.slice(0, 10),
    }, null, 2),
    "",
    "## Regeln",
    "- Deutsch mit echten Umlauten (ä, ö, ü, ß). Keine Em-Dashes.",
    "- Neutral, sachlich, keine Spekulation.",
    "- lmaa.space nicht erwähnen.",
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
    "[1–2 Sätze: Hauptablehnungsgrund. Für Dashboard-Kommentarfeld.]",
    "```",
    "",
    "## Langbegründung",
    "```md",
    "[300–500 Wörter. Abschnitte: ## Einleitung / ## Ablehnungsgründe (### Unterabschnitt je Grund) / ## Schluss. Inline-Quellenangaben wenn nötig.]",
    "",
    REJECTION_LINK_BLOCK,
    "```",
  ].join("\n");
}

async function generateRejectionOutput(prompt: string): Promise<string> {
  let response = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: 0.2,
    });
    if (response.includes("## Kurzbegründung") && response.includes("## Langbegründung")) {
      return response;
    }
  }
  return response;
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
  }));
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
