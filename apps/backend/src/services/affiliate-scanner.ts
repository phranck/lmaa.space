import { DEFAULT_HOST, DEFAULT_MODEL, ollamaGenerate, tryParseJson } from "@lmaa/llm";
import type { OllamaMessage } from "@lmaa/llm";
import { SETTINGS_KEYS } from "@lmaa/shared";

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

const SYSTEM_PROMPT = `Du bist ein Affiliate-Marketing-Analyst. Deine Aufgabe ist es, fuer einen gegebenen Online-Shop zu recherchieren, ob ein Affiliate-/Partnerprogramm existiert.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt im folgenden Format (keine Markdown-Fences, kein zusaetzlicher Text):

{
  "status": "direct" | "network" | "inquiry" | "none",
  "programFound": true | false,
  "programType": "direct" | "network" | "none" | null,
  "programUrl": "URL zum Partnerprogramm" | null,
  "networkName": "Name des Affiliate-Netzwerks (z.B. AWIN, CJ, Tradedoubler)" | null,
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
- "status" ist "direct" wenn der Shop ein eigenes Partnerprogramm betreibt
- "status" ist "network" wenn das Programm ueber ein Affiliate-Netzwerk laeuft
- "status" ist "inquiry" wenn kein Programm gefunden wurde, aber eine Direktanfrage sinnvoll waere
- "status" ist "none" wenn kein Programm existiert und eine Anfrage nicht sinnvoll erscheint
- Sei gruendlich bei der Recherche und nenne konkrete URLs und Details
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
 * Scan a single shop for affiliate program information using the LLM.
 */
export async function scanShopAffiliate(
  shopName: string,
  shopUrl: string,
): Promise<AffiliateScanLlmResult> {
  const { host, apiKey } = await getOllamaConfig();

  const messages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Recherchiere das Affiliate-/Partnerprogramm fuer folgenden Shop:\n\nShop-Name: ${shopName}\nShop-URL: ${shopUrl}\n\nPruefe insbesondere:\n1. Die Website selbst (Footer, "Partner werden", "Affiliate")\n2. Bekannte Affiliate-Netzwerke (AWIN, CJ, Tradedoubler, etc.)\n3. Allgemeine Informationen zum Haendler`,
    },
  ];

  const raw = await ollamaGenerate({
    host,
    apiKey,
    model: DEFAULT_MODEL,
    messages,
    maxTokens: 2048,
    numCtx: 8192,
    temperature: 0.2,
  });

  const parsed = tryParseJson<AffiliateScanLlmResult>(raw);
  if (!parsed) {
    throw new Error(`Failed to parse LLM response for ${shopName}`);
  }

  return parsed;
}
