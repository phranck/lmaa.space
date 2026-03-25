import { DEFAULT_HOST, DEFAULT_MODEL, ollamaGenerate, tryParseJson } from "@lmaa/llm";
import type { OllamaMessage } from "@lmaa/llm";
import { SETTINGS_KEYS } from "@lmaa/shared";

import { crawlShopForAffiliateEvidence } from "./affiliate-crawler.js";
import { logger } from "../lib/logger.js";
import { getSettings } from "../repositories/app-settings.js";

interface AffiliateScanLlmResult {
  status: "direct" | "network" | "inquiry" | "none";
  programFound: boolean;
  programType: string | null;
  programUrl: string | null;
  networkName: string | null;
  compensationModel: string | null;
  commission: string | null;
  cookieDuration: string | null;
  payoutThreshold: string | null;
  applicationUrl: string | null;
  contactEmail: string | null;
  requirements: string | null;
  notes: string | null;
  recommendation: string | null;
}

const SYSTEM_PROMPT = `Du bist ein Affiliate-Marketing-Analyst. Du bekommst gecrawlte Daten von einer Shop-Website und sollst daraus bestimmen, ob ein Affiliate-/Partnerprogramm existiert.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt im folgenden Format (keine Markdown-Fences, kein zusaetzlicher Text):

{
  "status": "direct" | "network" | "inquiry" | "none",
  "programFound": true | false,
  "programType": "direct" | "network" | "none" | null,
  "programUrl": "URL zum Partnerprogramm" | null,
  "networkName": "Name des Affiliate-Netzwerks (z.B. Awin, CJ Affiliate, Tradedoubler)" | null,
  "compensationModel": "percentage" | "fixed" | "hybrid" | null,
  "commission": "Beschreibung der Provision (z.B. '8% pro Sale')" | null,
  "cookieDuration": "Cookie-Laufzeit (z.B. '30 Tage')" | null,
  "payoutThreshold": "Mindestauszahlung (z.B. '25 EUR')" | null,
  "applicationUrl": "URL zur Bewerbung" | null,
  "contactEmail": "Kontakt-E-Mail fuer Affiliate-Anfragen" | null,
  "requirements": "Besondere Anforderungen oder Einschraenkungen" | null,
  "notes": "Zusaetzliche relevante Informationen zum Shop und Programm" | null,
  "recommendation": "Kurze Handlungsempfehlung" | null
}

Regeln:
- Stuetze dich AUSSCHLIESSLICH auf die bereitgestellten Crawl-Daten. Erfinde KEINE Informationen.
- Wenn keine Hinweise gefunden wurden, setze status auf "none" oder "inquiry". Erfinde kein Programm.
- Erkannte Tracking-Netzwerke (aus Script-Erkennung) sind ein sicherer Beweis fuer ein Affiliate-Programm.
- "status" ist "direct" wenn der Shop ein eigenes Partnerprogramm betreibt
- "status" ist "network" wenn das Programm ueber ein Affiliate-Netzwerk laeuft (Awin, CJ, Tradedoubler, Adcell, etc.)
- "status" ist "inquiry" wenn kein klares Programm gefunden wurde, aber Hinweise auf Kooperationsmoeglichkeiten existieren oder eine Direktanfrage sinnvoll waere
- "status" ist "none" wenn keinerlei Hinweise auf ein Affiliate-/Partnerprogramm gefunden wurden
- Wenn Affiliate-Links oder Netzwerk-Keywords gefunden wurden, ist das ein starker Hinweis auf ein existierendes Programm
- "Provisionen", "Werbepartner", "Kooperationspartner", "Empfehlungsprogramm" sind deutsche Begriffe fuer Affiliate-Programme
- Ein Hinweis in der Datenschutzerklaerung auf Tracking-Dienste (Awin, CJ, Tradedoubler etc.) ist ein sicherer Beweis fuer ein aktives Affiliate-Netzwerk-Programm
- Wenn nur auf der Impressum- oder AGB-Seite relevante Hinweise existieren, setze status="inquiry" mit Empfehlung zur Direktanfrage
- "Influencer-Programm" und "Brand Ambassador" sind als Affiliate-Programm zu behandeln (status="direct")
- Antworte auf Deutsch`;

async function getOllamaConfig(): Promise<{ host: string; apiKey: string | undefined }> {
  const settings = await getSettings([
    SETTINGS_KEYS.OLLAMA_HOST,
    SETTINGS_KEYS.OLLAMA_API_KEY,
  ]);
  return {
    host: settings[SETTINGS_KEYS.OLLAMA_HOST] || DEFAULT_HOST,
    apiKey: settings[SETTINGS_KEYS.OLLAMA_API_KEY] || undefined,
  };
}

/**
 * Build a user prompt from crawled evidence.
 */
function buildEvidencePrompt(shopName: string, shopUrl: string, crawlData: Awaited<ReturnType<typeof crawlShopForAffiliateEvidence>>): string {
  const sections: string[] = [];

  sections.push(`Shop: ${shopName}`);
  sections.push(`URL: ${shopUrl}`);
  sections.push(`Website erreichbar: ${crawlData.reachable ? "Ja" : "Nein"}`);

  if (crawlData.metaDescription) {
    sections.push(`\nMeta-Beschreibung: ${crawlData.metaDescription}`);
  }

  if (crawlData.detectedNetworks.length > 0) {
    sections.push(`\n*** AFFILIATE-NETZWERK ERKANNT (via Tracking-Scripts): ${crawlData.detectedNetworks.join(", ")} ***`);
    sections.push("Dies ist ein sicherer Nachweis fuer ein aktives Affiliate-Programm.");
  }

  if (crawlData.sitemapHits.length > 0) {
    sections.push(`\nAffiliate-relevante URLs aus sitemap.xml:`);
    for (const url of crawlData.sitemapHits) {
      sections.push(`  - ${url}`);
    }
  }

  if (crawlData.keywordMatches.length > 0) {
    sections.push(`\nGefundene Affiliate-Keywords auf der Hauptseite: ${crawlData.keywordMatches.join(", ")}`);
  } else {
    sections.push("\nKeine Affiliate-Keywords auf der Hauptseite gefunden.");
  }

  if (crawlData.affiliateLinks.length > 0) {
    sections.push("\nAffiliate-relevante Links auf der Website:");
    for (const link of crawlData.affiliateLinks) {
      sections.push(`  - "${link.text}" -> ${link.href}`);
    }
  } else {
    sections.push("\nKeine Affiliate-relevanten Links gefunden.");
  }

  if (crawlData.subpageContents.length > 0) {
    sections.push("\nInhalte gecrawlter Unterseiten (vollstaendiger Text):");
    for (const sp of crawlData.subpageContents) {
      sections.push(`\n[[${sp.url}]]`);
      sections.push(sp.text);
    }
  }

  if (crawlData.contactEmail) {
    sections.push(`\nGefundene Kontakt-E-Mail: ${crawlData.contactEmail}`);
  }

  sections.push("\nAnalysiere diese Daten und bestimme den Affiliate-Status des Shops.");

  return sections.join("\n");
}

/**
 * Scan a single shop for affiliate program information.
 *
 * Two-stage process:
 * 1. Crawl the shop website for affiliate evidence (links, keywords, subpages)
 * 2. Send the evidence to the LLM for structured analysis
 */
export async function scanShopAffiliate(
  shopName: string,
  shopUrl: string,
): Promise<AffiliateScanLlmResult> {
  // Stage 1: Crawl
  logger.info({ shopName, shopUrl }, "Starting affiliate scan (crawl + LLM)");
  const crawlData = await crawlShopForAffiliateEvidence(shopUrl);

  // Stage 2: LLM analysis
  const { host, apiKey } = await getOllamaConfig();
  const evidencePrompt = buildEvidencePrompt(shopName, shopUrl, crawlData);

  const messages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: evidencePrompt },
  ];

  const raw = await ollamaGenerate({
    host,
    apiKey,
    model: DEFAULT_MODEL,
    messages,
    maxTokens: 2048,
    numCtx: 32768,
    temperature: 0.2,
  });

  const parsed = tryParseJson<AffiliateScanLlmResult>(raw);
  if (!parsed) {
    throw new Error(`Failed to parse LLM response for ${shopName}`);
  }

  // Use crawled email if LLM didn't find one
  if (!parsed.contactEmail && crawlData.contactEmail) {
    parsed.contactEmail = crawlData.contactEmail;
  }

  if (parsed.networkName) {
    parsed.networkName = normalizeNetworkName(parsed.networkName);
  }

  return parsed;
}

const NETWORK_ALIASES: [RegExp, string][] = [
  [/\bawin\b/i, "Awin"],
  [/\baffilinet\b/i, "Awin"],
  [/\bzanox\b/i, "Awin"],
  [/\bcj\b/i, "CJ Affiliate"],
  [/\bcommission\s*junction\b/i, "CJ Affiliate"],
  [/\btradedoubler\b/i, "Tradedoubler"],
  [/\btradetracker\b/i, "TradeTracker"],
  [/\brakuten\b/i, "Rakuten"],
  [/\bshare\s*a\s*sale\b/i, "ShareASale"],
  [/\bimpact\b/i, "Impact"],
  [/\bpartnerize\b/i, "Partnerize"],
  [/\bbelboon\b/i, "Belboon"],
  [/\badcell\b/i, "Adcell"],
  [/\bwebgains\b/i, "Webgains"],
  [/\bdigistore\b/i, "Digistore24"],
  [/\bfinance\s*ads\b/i, "FinanceAds"],
  [/\bdaisycon\b/i, "Daisycon"],
];

function normalizeNetworkName(raw: string): string {
  const trimmed = raw.trim();
  for (const [pattern, canonical] of NETWORK_ALIASES) {
    if (pattern.test(trimmed)) return canonical;
  }
  return trimmed;
}
