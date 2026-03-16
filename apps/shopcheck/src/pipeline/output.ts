import { TEMPERATURE_NARRATIVE } from "../constants";
import type { DecisionOutcome } from "./decision";
import type { ExtractedFacts } from "./extract";
import type { GeoResult } from "./geocode";
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

/** Extract description from LLM response: try JSON first, then plain text. */
function extractDescription(raw: string): string | null {
  // Try JSON: {"description": "..."}
  const parsed = tryParseJson<{ description?: string }>(raw);
  if (parsed?.description) return parsed.description;

  // Claude might return plain text or markdown - use it directly if it looks like a description
  const stripped = raw
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // If it's long enough and doesn't look like JSON/code, treat as plain text description
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

async function generateDescription(input: ShopOutputInput): Promise<string> {
  const pageContext = selectDescriptionPages(input.pageTexts);

  const prompt = [
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
    "- Every sentence must contain a concrete, verifiable fact specific to this shop. Generic sentences that could apply to any shop are forbidden.",
    "- No meta-statements about the website ('well-structured site', 'comprehensive information').",
    "- No generic filler ('transparent communication', 'modern approach', 'broad palette').",
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
    "You are a curious journalist writing a mini-portrait, not a bureaucrat filling out a form.",
    "Lead with what makes this shop interesting or unique, not with dry legal facts.",
    "If the source material has a story, make it the heart of the description.",
    "Legal form, owners, and headquarters are important but weave them in naturally.",
    "",
    "## Content (use every detail you can evidence)",
    "1. What makes this shop special. Why does it exist, what is its mission or story?",
    "2. Origin story: founding year, founders, motivation. Only if evidenced, otherwise skip entirely.",
    "3. Product range: focus areas, concrete categories, name specific brands or products. Workshops, courses, events if available.",
    "4. Interesting details: certifications, sustainability, awards, amusing anecdotes.",
    "5. Shipping regions in one short sentence. No shipping costs or pricing.",
    "",
    "## Style",
    "- Vary sentence openings, lengths, and structures. Natural prose, not a bullet list in disguise.",
    "- Active voice. Short and punchy mixed with longer sentences. Never more than two ideas per sentence.",
    "- Each fact exactly once. Shop name max 2-3 times.",
    "- Unknown details: leave out completely. Never write 'details are not known'.",
    "- Min 800 chars, ideally 1200-1800. Paragraphs separated by \\n\\n.",
    "",
    "## Response format",
    "Reply as JSON only: {\"description\": \"...\"}",
    "Use \\n\\n for paragraph breaks inside the string.",
    "Bold the shop name on its FIRST mention only: **Shopname**.",
  ].join("\n");

  try {
    const raw = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: TEMPERATURE_NARRATIVE,
    });
    const description = extractDescription(raw);
    if (description) return boldFirstMention(description, input.shopName);

    // Retry once
    const retry = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: TEMPERATURE_NARRATIVE,
    });
    const retryDescription = extractDescription(retry);
    if (retryDescription) return boldFirstMention(retryDescription, input.shopName);
  } catch (error) {
    if (error instanceof LlmFatalError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Description generation failed: ${detail}`);
  }

  return `**${input.shopName}** ist ein Onlineshop mit den aktuell erhobenen Eckdaten.`;
}

export async function buildShopJson(input: ShopOutputInput): Promise<ShopJson> {
  const resolvedName = input.facts.legalEntity ?? input.shopName;
  const description = await generateDescription({ ...input, shopName: resolvedName });

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
