import { TEMPERATURE_NARRATIVE } from "../constants";
import type { DecisionOutcome } from "./decision";
import type { ExtractedFacts } from "./extract";
import type { GeoResult } from "./geocode";
import { getForbiddenDashViolation, getGermanSpellingViolation } from "../lib/text-rules";
import { tryParseJson } from "../lib/utils";
import { LlmFatalError, llmGenerate } from "../llm/client";

export type ShopOutputInput = {
  shopName: string;
  shopUrl: string;
  decision: DecisionOutcome;
  facts: ExtractedFacts;
  geo: GeoResult;
  categories: string[];
  pageTexts: Array<{ url: string; text: string }>;
};

export type ShopJson = {
  name: string;
  url: string;
  description: string;
  categories: string[];
  contactEmail: string | null;
  shippingRegions: Array<"DE" | "AT" | "CH" | "EU" | "WORLD">;
  legal: {
    entityName: string | null;
    entityType: string | null;
    owners: string[];
    headquartersSource: string | null;
  };
  headquarters: {
    street: string | null;
    postalCode: string | null;
    city: string | null;
    state: string | null;
    countryCode: string | null;
  };
  geo: {
    latitude: number | null;
    longitude: number | null;
  };
  socialMedia: {
    mastodon: string | null;
    bluesky: string | null;
    twitter: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    twitch: string | null;
    pinterest: string | null;
    linkedin: string | null;
    facebook: string | null;
    threads: string | null;
    patreon: string | null;
  };
  affiliate: {
    infoUrl: string | null;
  };
  notes: {
    focus: string[];
    brandsOrProducts: string[];
    companyPresentation: string | null;
  };
};

export type RejectionMarkdown = {
  shortReason: string;
  longReason: string;
  markdown: string;
};

function boldFirstMention(text: string, shopName: string): string {
  if (!shopName) return text;
  const escaped = shopName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\*\\*${escaped}\\*\\*`, "i").test(text)) return text;
  return text.replace(new RegExp(escaped, "i"), `**${shopName}**`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toNaturalList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`;
}

function normalizeCompanyPresentation(
  presentation: string | null | undefined,
  displayName: string,
  legalEntity: string | null,
): string | null {
  if (!presentation) return null;
  let normalized = presentation.trim();
  if (!normalized) return null;
  const replacements = [legalEntity, displayName].filter((value): value is string => Boolean(value));
  for (const value of replacements) {
    normalized = normalized.replace(new RegExp(`^${escapeRegex(value)}\\s+ist\\s+`, "i"), `${displayName} ist `);
    normalized = normalized.replace(new RegExp(`^${escapeRegex(value)}\\s+wird\\s+`, "i"), `${displayName} wird `);
  }
  normalized = normalized.replace(/^Der Shop wird als\s+/i, `${displayName} wird als `);
  normalized = normalized.replace(/^Der Shop\s+/i, `${displayName} `);
  normalized = normalized.replace(/^Das Unternehmen\s+/i, `${displayName} `);
  return normalized;
}

function selectNarrativeFocus(focus: string[]): string[] {
  const excluded = /\b(kollektiv|sexshop|online-shop|onlineshop|unternehmen|einzelhandel|fachhaendler|fachhändler|politisch engagierter einzelhandel)\b/i;
  return Array.from(new Set(focus.map((value) => value.trim()).filter(Boolean))).filter((value) => !excluded.test(value)).slice(0, 3);
}

/** Extract description from LLM response: try JSON first, then plain text. */
function extractDescription(raw: string): string | null {
  // Try direct JSON parse
  const parsed = tryParseJson<{ description?: string }>(raw);
  if (parsed?.description) return parsed.description;

  // Try JSON inside a code fence
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    const fenceParsed = tryParseJson<{ description?: string }>(fenceMatch[1]);
    if (fenceParsed?.description) return fenceParsed.description;
  }

  // Try extracting the description value from a partial/malformed JSON blob
  const valueMatch = raw.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (valueMatch?.[1] && valueMatch[1].length > 100) {
    return valueMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }

  // Plain text fallback: strip fences and use if long enough
  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  if (stripped.length > 200 && !stripped.startsWith("{")) return stripped;

  return null;
}

const DESCRIPTION_PAGE_KEYWORDS = ["impressum", "about", "ueber", "über", "our-story", "unternehmen", "company", "kontakt", "contact", "versand", "shipping"];

function selectDescriptionPages(pages: Array<{ url: string; text: string }>): string {
  if (pages.length === 0) return "";
  const homepage = pages[0];
  const relevant = pages.filter((p) => {
    const lower = p.url.toLowerCase();
    return DESCRIPTION_PAGE_KEYWORDS.some((kw) => lower.includes(kw));
  });
  const selected = [homepage, ...relevant.filter((p) => p.url !== homepage.url)];
  const combined = selected.map((p) => `[${p.url}]\n${p.text.slice(0, 3000)}`).join("\n\n---\n\n");
  return combined.slice(0, 15000);
}

function buildDescriptionPrompt(input: ShopOutputInput, pageContext: string): string {
  return [
    "## Facts",
    `shopName=${input.shopName}`,
    `shopUrl=${input.shopUrl}`,
    JSON.stringify({
      legalEntity: input.facts.legalEntity,
      legalEntityType: input.facts.legalEntityType,
      owners: input.facts.owners,
      shippingRegions: input.facts.shippingRegions,
      address: input.facts.address,
      notes: input.facts.notes,
      evidence: input.facts.evidence.slice(0, 40),
    }),
    "",
    "## Source pages",
    pageContext,
    "",
    "## Hard constraints (violations require a full rewrite)",
    "- Do not use em-dashes, en-dashes, or spaced hyphens mid-sentence. Formulate clear and understandable sentences instead.",
    "- German with real umlauts (ä, ö, ü) and ß.",
    "- Determine the grammatical gender of the shop name from its final noun component and use the correct definite article consistently (e.g. '-rösterei' → die, '-handel' → der, '-laden' → der, '-markt' → der, '-shop' → der, '-haus' → das, '-werk' → das, '-manufaktur' → die, '-gärtnerei' → die).",
    "- Strictly based on the provided facts and source pages. No speculation, no invented details.",
    "- Nearly every sentence should be anchored in a concrete, verifiable fact specific to this shop. Short connecting sentences are allowed, but they must not invent anything.",
    "- Generic sentences that could apply to any shop are forbidden.",
    "- No meta-statements about the website ('well-structured site', 'comprehensive information').",
    "- No generic filler ('transparent communication', 'modern approach', 'broad palette').",
    "- Avoid empty praise and directory clichés such as 'steht für', 'alles, was das Herz höher schlagen lässt', 'renommierte Marken', 'Leidenschaft und Expertise', or 'faire Preise' unless directly evidenced in a specific way.",
    "- No mention of newsletter, privacy policy, imprint, ToS, cookies.",
    "- No mention of VAT/tax IDs, trade register numbers, insurance details, or any other legal registration data.",
    "- No listing of social media presence as content.",
    "- No filler words in the German output: kontinuierlich, ständig, stets, umfassend, vielfältig.",
    "- Do not mention lmaa.space.",
    "",
    "## Task",
    "Write a detailed German shop description for an online shop directory.",
    "",
    "## Tone",
    "Write as a knowledgeable person who genuinely finds this shop interesting and wants to tell a friend about it.",
    "Write like someone who has spent real time with the people behind the shop and gives a personal recommendation.",
    "The text should read like you are recommending the shop to a good friend after getting to know the people and the place over time.",
    "The tone should feel close, human, and specific, but still grounded in verifiable facts.",
    "Always write from an external perspective. Never speak as if you were the shop or part of its team.",
    "Do not use a first-person narrator. No 'ich', 'mir', 'mich', 'mein', 'meine', 'wir', 'uns', or 'unser' as narrator voice.",
    "Make the recommendation feel lived-in: as if you remember specific things about the shop and its people, not as if you are summarizing a directory entry.",
    "Lead with what makes this shop interesting or unique, not with dry legal facts.",
    "If the source material has a story, make it the heart of the description.",
    "If founders, team members, origin story, or a concrete shop anecdote are evidenced, weave them in naturally and early.",
    "Legal form, owners, and headquarters are important but weave them in naturally.",
    "",
    "## Content (use every detail you can evidence)",
    "1. What makes this shop special. Why does it exist, what is its mission or story?",
    "2. Origin story: founding year, founders, motivation. Only if evidenced, otherwise skip entirely.",
    "3. Product range: focus areas, concrete categories, name specific brands or products. Workshops, courses, events if available.",
    "4. Interesting details: certifications, sustainability, awards, amusing anecdotes.",
    "5. Shipping regions in one short sentence. No shipping costs or pricing.",
    "6. Include at least two shop-specific details that make the recommendation memorable, for example an origin story element, a naming detail, an unusual product focus, a distinctive cooperation, or a concrete sustainability practice.",
    "",
    "## Style",
    "- Open with a concrete, memorable detail or observation, not with a generic category summary.",
    "- Vary sentence openings, lengths, and structures. Natural prose, not a bullet list in disguise.",
    "- Active voice. Short and punchy mixed with longer sentences. Never more than two ideas per sentence.",
    "- Never use the shop's own voice. No 'wir', 'unser', 'bei uns' or similar first-person company phrasing.",
    "- No first-person narrator voice. Do not write 'ich würde', 'ich kenne', 'mir gefällt', 'wir würden' or similar.",
    "- Sound like a personal recommendation from outside, not like PR copy and not like an official company profile.",
    "- Favor a few vivid, characteristic details over a complete but bland catalog summary.",
    "- Let specific details do the work. Do not stack abstract nouns or marketing language.",
    "- Do not fall back to directory prose such as 'Auffällig ist ...', 'Konkrete Schwerpunkte ...', 'Das Sortiment umfasst ...', 'Das Unternehmen liefert ...', or 'positioniert sich als ...'.",
    "- Each fact exactly once. Shop name max 2-3 times.",
    "- Unknown details: leave out completely. Never write 'details are not known'.",
    "- Min 800 chars, ideally 1200-1800. Paragraphs separated by \\n\\n.",
    "",
    "## Response format",
    "Reply as JSON only: {\"description\": \"...\"}",
    "Use \\n\\n for paragraph breaks inside the string.",
    "Bold the shop name on its FIRST mention only: **Shopname**.",
  ].join("\n");
}

function buildDescriptionRetryPrompt(basePrompt: string, previousAttempt: string, reasons: string[]): string {
  return [
    basePrompt,
    "",
    "## Vorheriger ungültiger Versuch",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    previousAttempt.slice(0, 4000),
    "",
    "## Korrektur",
    "Schreibe die Beschreibung vollständig neu.",
    "Verwende deutlich mehr konkrete, shop-spezifische Details aus den gelieferten Fakten und Quellseiten.",
    "Die Beschreibung muss sich wie eine persönliche Empfehlung lesen, nicht wie ein Platzhalter oder Datenbankeintrag.",
    "Verwende keine Em-Dashes und keine En-Dashes.",
    "Formuliere stattdessen vollständige, saubere Sätze.",
  ].join("\n");
}

function buildDescriptionRescuePrompt(input: ShopOutputInput, pageContext: string, failureReasons: string[]): string {
  return [
    "## Aufgabe",
    "Die vorherigen Beschreibungsversuche sind an Format- oder Stilregeln gescheitert.",
    "Schreibe die Beschreibung jetzt noch einmal komplett neu und deutlich natuerlicher.",
    "",
    "## Fakten",
    JSON.stringify({
      shopName: input.shopName,
      shopUrl: input.shopUrl,
      legalEntity: input.facts.legalEntity,
      shippingRegions: input.facts.shippingRegions,
      address: input.facts.address,
      notes: input.facts.notes,
      evidence: input.facts.evidence.slice(0, 30),
    }),
    "",
    "## Quellseiten",
    pageContext,
    "",
    "## Was vorher schiefging",
    ...failureReasons.map((reason) => `- ${reason}`),
    "",
    "## Regeln",
    "- Schreibe idiomatisches, lebendiges Deutsch mit natuerlichem Satzrhythmus.",
    "- Keine festen Schablonen wie 'Inhaltlich dreht sich ...', 'In den Quellen tauchen ...', 'Gerade die klare Zuspitzung ...' oder 'Wer fuer ...'.",
    "- Keine Ich- oder Wir-Erzaehlstimme.",
    "- Keine Em-Dashes, keine En-Dashes, echte Umlaute und ß.",
    "- Nur belegbare Details aus Fakten und Quellseiten.",
    "- 2 bis 3 Absaetze mit klar unterscheidbarer Satzmelodie.",
    "- Verwende den sichtbaren Shopnamen als erste Nennung, nicht nur die Rechtsform.",
    "",
    "## Antwortformat",
    "Antworte nur als JSON: {\"description\":\"...\"}",
    "Nutze \\n\\n fuer Absatzumbrueche.",
    "Die erste Nennung des Shopnamens fett: **Shopname**.",
  ].join("\n");
}

const GENERIC_DESCRIPTION_PATTERNS = [
  /mit den aktuell erhobenen eckdaten/i,
  /\bist ein onlineshop\b/i,
  /\bist ein online-shop\b/i,
  /\bbietet produkte an\b/i,
  /\bführt produkte\b/i,
  /\baktuell erhobenen daten\b/i,
  /^\s*auffaellig ist\b/im,
  /^\s*wer fuer\b/im,
  /^\s*gerade die klare zuspitzung auf\b/im,
  /\bimmer wieder tauchen dabei dinge wie\b/i,
  /^\s*konkrete schwerpunkte\b/im,
  /\bdas sortiment umfasst\b/i,
  /\bdas unternehmen liefert\b/i,
  /\bpositioniert sich als\b/i,
  /\bich\b/i,
  /\bmir\b/i,
  /\bmich\b/i,
  /\bmein(?:e|em|en|er)?\b/i,
  /\bwir\b/i,
  /\buns\b/i,
  /\bunser(?:e|em|en|er)?\b/i,
];

type DescriptionCritique = {
  verdict?: "accept" | "rewrite";
  reasons?: string[];
};

function buildDescriptionCritiquePrompt(input: ShopOutputInput, description: string, pageContext: string): string {
  return [
    "Du bist ein strenger Redakteur fuer Shop-Beschreibungen.",
    "Pruefe, ob die folgende Beschreibung den Anforderungen genuegt oder neu geschrieben werden muss.",
    "",
    "## Faktenbasis",
    JSON.stringify({
      shopName: input.shopName,
      shopUrl: input.shopUrl,
      shippingRegions: input.facts.shippingRegions,
      notes: input.facts.notes,
      evidence: input.facts.evidence.slice(0, 25),
    }),
    "",
    "## Quellseiten",
    pageContext,
    "",
    "## Beschreibung",
    description,
    "",
    "## Pruefkriterien",
    "- Klingt wie eine persoenliche Empfehlung an einen Freund aus externer Perspektive.",
    "- Klingt so, als haette die schreibende Person den Laden und seine Leute kennengelernt, ohne etwas zu erfinden.",
    "- Verwendet keine Ich- oder Wir-Erzaehlstimme.",
    "- Nicht generisch, nicht wie ein Platzhalter, nicht wie ein Datenbank- oder Directory-Satz.",
    "- Enthält mindestens zwei konkrete shop-spezifische Details aus Fakten oder Quellseiten.",
    "- Mehrere Saetze und mindestens zwei sinnvolle Absaetze.",
    "- Keine Leerformeln, keine austauschbaren Standardsaetze.",
    "- Wenn eine Entstehungsgeschichte, ein Teamdetail oder eine kleine Eigenheit belegt ist, sollte der Text das aufgreifen.",
    "",
    "## Antwortformat",
    "Antworte nur als JSON: {\"verdict\":\"accept|rewrite\",\"reasons\":[\"...\"]}",
    "Wenn die Beschreibung nicht gut genug ist, setze verdict auf rewrite und nenne knappe konkrete Gruende.",
  ].join("\n");
}

function extractDescriptionCritique(raw: string): DescriptionCritique | null {
  const parsed = tryParseJson<DescriptionCritique>(raw);
  if (!parsed || (parsed.verdict !== "accept" && parsed.verdict !== "rewrite")) return null;
  return {
    verdict: parsed.verdict,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map((value) => String(value).trim()).filter(Boolean) : [],
  };
}

export function collectDescriptionIssues(description: string, input: ShopOutputInput): string[] {
  const issues: string[] = [];
  if (description.trim().length < 500) {
    issues.push("Die Beschreibung ist deutlich zu kurz und bleibt inhaltlich zu duerftig.");
  }
  if (!description.includes("\n\n")) {
    issues.push("Die Beschreibung braucht mindestens zwei Absaetze mit klarer Struktur.");
  }
  for (const pattern of GENERIC_DESCRIPTION_PATTERNS) {
    if (pattern.test(description)) {
      issues.push("Die Beschreibung enthaelt generische Platzhalter- oder Katalogsprache.");
      break;
    }
  }

  const detailCandidates = [
    ...input.facts.notes.focus,
    ...input.facts.notes.brandsOrProducts,
    ...input.facts.evidence.map((item) => item.value),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length >= 4)
    .slice(0, 40);

  const lower = description.toLowerCase();
  const matchedDetails = new Set(
    detailCandidates.filter((value) => lower.includes(value.toLowerCase())),
  );
  if (matchedDetails.size < 2) {
    issues.push("Die Beschreibung nennt zu wenige konkrete shop-spezifische Details aus den gesammelten Fakten.");
  }
  return issues;
}

export function buildDeterministicDescriptionFallback(input: ShopOutputInput): string {
  const displayName = input.shopName.trim() || input.facts.legalEntity?.trim() || input.shopUrl;
  const subject = `**${displayName}**`;
  const narrativeFocus = selectNarrativeFocus(input.facts.notes.focus);
  const brands = toNaturalList(input.facts.notes.brandsOrProducts.slice(0, 4));
  const presentation = normalizeCompanyPresentation(
    input.facts.notes.companyPresentation,
    displayName,
    input.facts.legalEntity,
  );
  const shipping = input.facts.shippingRegions.length > 0
    ? `Geliefert wird in ${input.facts.shippingRegions.join(", ")}.`
    : "";
  const address = [input.facts.address.city, input.facts.address.countryCode].filter(Boolean).join(", ");

  const paragraphs = [
    [
      presentation
        ? boldFirstMention(presentation, displayName)
        : `${subject} wirkt wie ein Laden, der sein Thema sehr bewusst und mit klarer Handschrift aufzieht.`,
      address ? `Der Sitz in ${address} gibt dem Ganzen einen konkreten Ort.` : "",
    ].filter(Boolean).join(" "),
    [
      narrativeFocus.length > 0
        ? `Inhaltlich dreht sich vieles um ${toNaturalList(narrativeFocus)}, was den Schwerpunkt des Shops schnell greifbar macht.`
        : "",
      brands
        ? `In den Quellen tauchen dabei Namen wie ${brands} auf, wodurch der Zuschnitt des Sortiments sehr konkret wird.`
        : "",
      shipping,
    ].filter(Boolean).join(" "),
  ].filter((paragraph) => paragraph.trim().length > 0);

  return paragraphs.join("\n\n");
}

function logDescriptionFallback(input: ShopOutputInput, reasons: string[]): void {
  const uniqueReasons = Array.from(new Set(reasons.map((reason) => reason.trim()).filter(Boolean)));
  const formattedReasons = uniqueReasons.length > 0 ? uniqueReasons.join(" | ") : "unknown";
  console.warn(
    `[shopcheck] description fallback used for ${input.shopUrl}: ${formattedReasons}`,
  );
}

async function generateDescription(input: ShopOutputInput): Promise<string> {
  const pageContext = selectDescriptionPages(input.pageTexts);
  const prompt = buildDescriptionPrompt(input, pageContext);
  const failureReasons: string[] = [];

  let currentPrompt = prompt;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const raw = await llmGenerate({
        prompt: currentPrompt,
        task: "narrative",
        temperature: TEMPERATURE_NARRATIVE,
      });
      const description = extractDescription(raw);
      if (!description) {
        failureReasons.push("Der Versuch war nicht als gueltiges JSON mit description parsebar.");
        currentPrompt = buildDescriptionRetryPrompt(prompt, raw, [
          "Der Versuch war nicht als gueltiges JSON mit description parsebar.",
        ]);
        continue;
      }

      const issues = collectDescriptionIssues(description, input);
      const dashViolation = getForbiddenDashViolation(description, "description");
      if (dashViolation) {
        issues.push(dashViolation.reason);
      }

      const spellingViolation = getGermanSpellingViolation(description, "description");
      if (spellingViolation) {
        issues.push(spellingViolation.reason);
      }

      if (issues.length > 0) {
        failureReasons.push(...issues);
        currentPrompt = buildDescriptionRetryPrompt(prompt, description, issues);
        continue;
      }

      const critiqueRaw = await llmGenerate({
        prompt: buildDescriptionCritiquePrompt(input, description, pageContext),
        task: "extraction",
        temperature: 0,
      });
      const critique = extractDescriptionCritique(critiqueRaw);
      if (!critique) {
        failureReasons.push("Die interne Qualitaetspruefung konnte das Ergebnis nicht freigeben.");
        currentPrompt = buildDescriptionRetryPrompt(prompt, description, [
          "Die interne Qualitaetspruefung konnte das Ergebnis nicht freigeben.",
        ]);
        continue;
      }
      if (critique.verdict !== "accept") {
        const critiqueReasons = critique.reasons?.length
          ? critique.reasons
          : ["Die Beschreibung ist noch zu generisch oder zu duerftig."];
        failureReasons.push(...critiqueReasons);
        currentPrompt = buildDescriptionRetryPrompt(
          prompt,
          description,
          critiqueReasons,
        );
        continue;
      }

      return boldFirstMention(description, input.shopName);
    }

    const rescueRaw = await llmGenerate({
      prompt: buildDescriptionRescuePrompt(input, pageContext, failureReasons.slice(-8)),
      task: "narrative",
      temperature: Math.max(0.2, TEMPERATURE_NARRATIVE / 2),
    });
    const rescueDescription = extractDescription(rescueRaw);
    if (rescueDescription) {
      const rescueIssues = collectDescriptionIssues(rescueDescription, input);
      const rescueDashViolation = getForbiddenDashViolation(rescueDescription, "description");
      if (rescueDashViolation) rescueIssues.push(rescueDashViolation.reason);
      const rescueSpellingViolation = getGermanSpellingViolation(rescueDescription, "description");
      if (rescueSpellingViolation) rescueIssues.push(rescueSpellingViolation.reason);
      if (rescueIssues.length === 0) {
        return boldFirstMention(rescueDescription, input.shopName);
      }
      failureReasons.push(...rescueIssues);
    } else {
      failureReasons.push("Auch der letzte Rescue-Versuch war nicht parsebar.");
    }
  } catch (error) {
    if (error instanceof LlmFatalError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    failureReasons.push(`LLM-Fehler: ${detail}`);
    console.error(`Description generation failed: ${detail}`);
  }

  logDescriptionFallback(input, failureReasons);
  return buildDeterministicDescriptionFallback(input);
}

export async function buildShopJson(input: ShopOutputInput): Promise<ShopJson> {
  const resolvedName = input.facts.legalEntity ?? input.shopName;
  const description = await generateDescription({
    ...input,
    shopName: input.shopName.trim() || resolvedName,
  });

  return {
    name: resolvedName,
    url: input.shopUrl,
    description,
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
