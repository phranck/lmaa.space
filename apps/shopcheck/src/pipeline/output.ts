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
    "Erstelle eine ausführliche, detailreiche Shopbeschreibung für ein Online-Shop-Verzeichnis.",
    "",
    "## Regeln",
    "- Strikt auf Basis der gegebenen Seiteninhalte und Fakten. Keine Spekulation, keine erfundenen Details.",
    "- Deutsch mit echten Umlauten und ß. Keine Em-Dashes (\u2014), nur normale Bindestriche (-).",
    "- Erwähne lmaa.space NICHT. Halte den Text neutral und sachlich.",
    "- Die Beschreibung muss AUSFÜHRLICH sein: mindestens 800 Zeichen, idealerweise 1200-1800 Zeichen.",
    "- Verwende Absätze (getrennt durch \\n\\n) für klare thematische Trennung.",
    "- Nutze konkrete Details aus den Seiteninhalten: Namen, Zahlen, Jahreszahlen, Orte, Produkte.",
    "",
    "## Stilregeln (WICHTIG)",
    "- AKTIV formulieren, nicht passiv. 'Das Unternehmen produziert...' statt 'Es werden Produkte hergestellt...'",
    "- Jede Information NUR EINMAL nennen. Keine Wiederholungen, keine Umformulierungen desselben Fakts.",
    "- Wenn du etwas nicht weisst, lass es KOMPLETT WEG. Schreibe NIEMALS Sätze wie 'Die Gründungsgeschichte ist nicht dokumentiert' oder 'Details hierzu sind nicht bekannt'. Einfach weglassen.",
    "- Keine Füllwörter und Phrasen: 'es ist klar, dass', 'kontinuierlich', 'ständig', 'stets', 'immer wieder', 'eine breite Palette'.",
    "- Kurze, klare Sätze. Nicht verschachteln. Ein Gedanke pro Satz.",
    "- Den Shopnamen im Text maximal 2-3 Mal verwenden, nicht in jedem Satz.",
    "- Absätze ohne Informationsgehalt weglassen. Lieber 3 gute Absätze als 4 mit Fülltext.",
    "- Versandkosten, Zahlungsarten und Preise NICHT einzeln aufzählen. Versandregionen nur kurz erwähnen (1 Satz).",
    "",
    "## Inhalt (alles einbauen, was aus den Seiten belegbar ist)",
    "1. Erster Absatz: Einordnung des Shops - Name, Sitz/Standort, Rechtsform, Inhaber/Geschäftsführer, Geschäftsmodell oder besondere Mission",
    "2. Zweiter Absatz: Gründungsgeschichte - Wann gegründet, von wem, warum, wie hat sich der Shop entwickelt. NUR wenn belegbar, sonst weglassen!",
    "3. Dritter Absatz: Sortiment im Detail - Fokusbereiche, konkrete Produktkategorien, konkrete Marken/Produkte namentlich nennen, Workshops/Kurse/Events falls vorhanden",
    "4. Vierter Absatz: Versand, Besonderheiten - Versandregionen nur kurz anreissen (z.B. 'liefert nach Deutschland, Österreich und in die Schweiz'), KEINE einzelnen Versandkosten oder Preisstaffeln auflisten. Zertifizierungen, Nachhaltigkeit, besondere Auszeichnungen.",
    "",
    "## Beispiel einer guten Beschreibung",
    "Beachte den Stil: kurze Sätze, aktive Sprache, keine Wiederholungen, konkrete Details:",
    "",
    "\"**buch7** ist ein unabhängiger Online-Buchhandel mit Sitz in Langweid am Lech bei Augsburg. Das Unternehmen wird als GmbH von Dr. Benedikt Gleich geführt und verfolgt ein besonderes Geschäftsmodell: 75 Prozent des Gewinns fließen in soziale, kulturelle und ökologische Projekte.\\n\\nDie Idee entstand 2005 in einem kleinen Freundeskreis, der sich vorgenommen hatte, die Welt ein Stück besser zu machen. 2008 ging der Shop online. Der Ansatz nutzt die Buchpreisbindung: Da Bücher überall gleich viel kosten, können Kundinnen und Kunden ohne Mehrkosten einkaufen und gleichzeitig gemeinnützige Projekte unterstützen.\\n\\nDas Sortiment umfasst Bücher aller Genres, darunter Romane, Krimis, Fantasy, Science-Fiction, Kinder- und Jugendliteratur, Sachbücher sowie E-Books und Hörbücher. Der Versand innerhalb Deutschlands ist kostenlos, in die Schweiz ab einem Bestellwert von 50 Euro.\\n\\nbuch7 ist nach den Prinzipien der Gemeinwohl-Ökonomie zertifiziert, nutzt erneuerbare Energien im Betrieb und versendet innerhalb Deutschlands klimaneutral. 2018 feierte das Unternehmen sein zehnjähriges Bestehen und gründete ein gemeinnütziges Kulturzentrum.\"",
    "",
    "## Antwortformat",
    "Antworte ausschließlich als JSON: {\"description\": \"...\"}",
    "Nutze \\n\\n für Absatztrennung innerhalb des Strings.",
    "Die ERSTE Erwähnung des Shopnamens im Text MUSS fett ausgezeichnet werden mit **Shopname**. Nur die erste, alle weiteren normal.",
    "",
    "## Extrahierte Fakten",
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
    "## Originale Seiteninhalte (als Quelle für Details)",
    pageContext,
  ].join("\n");

  try {
    const raw = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: TEMPERATURE_NARRATIVE,
    });
    const description = extractDescription(raw);
    if (description) return description;

    // Retry once
    const retry = await llmGenerate({
      prompt,
      task: "narrative",
      temperature: TEMPERATURE_NARRATIVE,
    });
    const retryDescription = extractDescription(retry);
    if (retryDescription) return retryDescription;
  } catch (error) {
    if (error instanceof LlmFatalError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Description generation failed: ${detail}`);
  }

  return `**${input.shopName}** ist ein Onlineshop mit den aktuell erhobenen Eckdaten.`;
}

export async function buildShopJson(input: ShopOutputInput): Promise<ShopJson> {
  const description = await generateDescription(input);

  return {
    name: input.shopName,
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
