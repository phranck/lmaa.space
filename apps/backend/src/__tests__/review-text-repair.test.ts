import { describe, expect, it } from "vitest";

import { REVIEW_RESULT_SCHEMA_VERSION, reviewResultSchema } from "@lmaa/contracts";

import { applyRepairedTexts, collectRepairableTexts } from "../services/review/text-repair.js";

const passingCriteria = {
  independentOnlinePresence: "pass",
  basedInEurope: "pass",
  notALargeCompany: "pass",
  notAMarketplace: "pass",
  notDropshipping: "pass",
  notAChain: "pass",
  notAnAffiliatePortal: "pass",
  noFarRightTies: "pass",
} as const;

function acceptResult(description: string) {
  return {
    schemaVersion: REVIEW_RESULT_SCHEMA_VERSION,
    verdict: "accept",
    criteria: passingCriteria,
    companySize: {
      employees: 12,
      revenueEur: null,
      referenceYear: 2025,
      isEstimate: false,
      sources: ["https://northdata.de/beispiel"],
      assessment: "Zwölf Mitarbeitende laut Unternehmensdatenbank.",
    },
    evidence: [
      { url: "https://beispiel.de/impressum", label: "Impressum", retrievedAt: "2026-08-15T10:00:00.000Z" },
    ],
    uncertainties: [],
    accept: {
      name: "Beispielladen",
      url: "https://beispiel.de",
      description,
      categories: ["Werkzeug"],
      paymentMethods: ["paypal"],
      shippingRegions: ["EU"],
      legal: { entityName: "Beispiel GmbH", entityType: "GmbH", owners: ["Ana Beispiel"] },
      headquarters: { city: "Bremen", countryCode: "DE", source: "Impressum" },
      socialMedia: [],
      notes: { focus: ["Handwerkzeug"], brandsOrProducts: [], companyPresentation: "Kleiner Fachhandel." },
    },
    reject: null,
    onhold: null,
  };
}

describe("text repair", () => {
  it("names the text that broke a mechanical rule", () => {
    const raw = acceptResult("**Beispielladen** — ein Fachhandel in Bremen.");
    const parsed = reviewResultSchema.safeParse(raw);

    expect(parsed.success).toBe(false);
    const repairable = parsed.success ? [] : collectRepairableTexts(parsed.error, raw);

    expect(repairable).toHaveLength(1);
    expect(repairable[0].path).toBe("accept.description");
    expect(repairable[0].value).toContain("—");
  });

  it("passes on anything that is not a wording problem", () => {
    // A verdict its own criteria contradict is not repaired by rewriting a
    // sentence, so the whole result still costs a fresh run.
    const raw = {
      ...acceptResult("**Beispielladen** ist ein Fachhandel in Bremen."),
      criteria: { ...passingCriteria, notAMarketplace: "fail" },
    };
    const parsed = reviewResultSchema.safeParse(raw);

    expect(parsed.success).toBe(false);
    expect(parsed.success ? [] : collectRepairableTexts(parsed.error, raw)).toHaveLength(0);
  });

  it("puts the rewritten text back and leaves everything else alone", () => {
    const raw = acceptResult("**Beispielladen** — ein Fachhandel in Bremen.");
    const repaired = applyRepairedTexts(
      raw,
      new Map([["accept.description", "**Beispielladen** ist ein Fachhandel in Bremen."]]),
    );

    const parsed = reviewResultSchema.safeParse(repaired);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.accept?.name).toBe("Beispielladen");
    expect(parsed.success && parsed.data.companySize.employees).toBe(12);
  });
});
