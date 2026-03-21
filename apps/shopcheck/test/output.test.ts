import assert from "node:assert/strict";
import test from "node:test";

import { buildDeterministicDescriptionFallback, collectDescriptionIssues } from "../src/pipeline/output";
import type { ShopOutputInput } from "../src/pipeline/output";

function createInput(): ShopOutputInput {
  return {
    shopName: "BG Befestigungstechnik GbR",
    shopUrl: "https://pegnitz-schrauben.de",
    decision: {
      verdict: "accept",
      criteria: [],
      unclearPoints: [],
    },
    facts: {
      legalEntity: "BG Befestigungstechnik GbR",
      legalEntityType: "GbR",
      owners: [],
      address: {
        street: "Mühllach 29",
        postalCode: "90552",
        city: "Röthenbach a. d. Pegnitz",
        state: null,
        countryCode: "DE",
        sourceUrl: null,
      },
      contact: { emails: ["mail@bg-befestigungstechnik.de"], phones: [] },
      shippingRegions: ["DE"],
      languageGermanLikely: true,
      exclusionSignals: [],
      socialMedia: {
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
      },
      affiliateInfoUrl: null,
      notes: {
        focus: ["Befestigungstechnik", "Schrauben", "Torbeschläge", "Bodenhülsen"],
        brandsOrProducts: ["AFNOR", "fischer", "DIN 936", "RAL Farbpulver"],
        companyPresentation:
          "BG Befestigungstechnik GbR ist ein spezialisierter Online-Shop für Befestigungsmaterial mit Sitz in Röthenbach a. d. Pegnitz.",
      },
      evidence: [
        {
          field: "notes.focus",
          value: "Befestigungstechnik",
          url: "https://pegnitz-schrauben.de",
          snippet: "Befestigungstechnik",
          confidence: 0.9,
        },
      ],
    },
    geo: { latitude: 1, longitude: 2, source: "test" },
    categories: ["Werkzeuge / DIY / Handwerken"],
    pageTexts: [],
  };
}

function createBrandVsEntityInput(): ShopOutputInput {
  return {
    ...createInput(),
    shopName: "fuckyeah.shop",
    shopUrl: "https://fuckyeah.shop/",
    facts: {
      ...createInput().facts,
      legalEntity: "FYSK GbR",
      notes: {
        focus: [
          "Sex-positiver Sexshop",
          "Queer-feministisches Kollektiv",
          "Sexualaufklärung",
          "Safer Sex",
        ],
        brandsOrProducts: ["Puissante", "Romp", "Tenga", "We Vibe"],
        companyPresentation:
          "Der Shop wird als sex-positives, queeres und feministisches Kollektiv betrieben, das 2016 gegründet wurde, um eine inklusive Alternative zu traditionellen Sexshops zu bieten.",
      },
      address: {
        street: "Caffamacherreihe 43",
        postalCode: "20355",
        city: "Hamburg",
        state: "Hamburg",
        countryCode: "DE",
        sourceUrl: null,
      },
      shippingRegions: ["EU"],
    },
  };
}

test("collectDescriptionIssues flags generic placeholder descriptions", () => {
  const issues = collectDescriptionIssues(
    "**BG Befestigungstechnik GbR** ist ein Onlineshop mit den aktuell erhobenen Eckdaten.",
    createInput(),
  );

  assert.ok(issues.some((issue) => issue.includes("zu kurz")));
  assert.ok(issues.some((issue) => issue.includes("Platzhalter")));
  assert.ok(issues.some((issue) => issue.includes("shop-spezifische Details")));
});

test("deterministic fallback produces a concrete multi-paragraph description", () => {
  const fallback = buildDeterministicDescriptionFallback(createInput());

  assert.match(fallback, /\*\*BG Befestigungstechnik GbR\*\*/);
  assert.match(fallback, /spezialisierter Online-Shop fuer Befestigungsmaterial|spezialisierter Online-Shop für Befestigungsmaterial/);
  assert.match(fallback, /Befestigungstechnik/);
  assert.match(fallback, /AFNOR|fischer|DIN 936|RAL Farbpulver/);
  assert.match(fallback, /\n\n/);
  assert.doesNotMatch(fallback, /Auffaellig ist/i);
  assert.doesNotMatch(fallback, /\bich\b/i);
  assert.doesNotMatch(fallback, /aktuell erhobenen Eckdaten/i);
  assert.doesNotMatch(fallback, /^Wer fuer/i);
  assert.doesNotMatch(fallback, /Gerade die klare Zuspitzung/i);
});

test("deterministic fallback prefers the visible shop name over the legal entity and avoids raw tag templates", () => {
  const fallback = buildDeterministicDescriptionFallback(createBrandVsEntityInput());

  assert.match(fallback, /\*\*fuckyeah\.shop\*\*/);
  assert.match(fallback, /sex-positives, queeres und feministisches Kollektiv/i);
  assert.match(fallback, /Puissante|Romp|Tenga|We Vibe/);
  assert.doesNotMatch(fallback, /^Wer fuer/i);
  assert.doesNotMatch(fallback, /Gerade die klare Zuspitzung/i);
  assert.doesNotMatch(fallback, /\*\*FYSK GbR\*\*/);
});
