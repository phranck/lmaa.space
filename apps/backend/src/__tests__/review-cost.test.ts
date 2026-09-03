import { describe, expect, it } from "vitest";

import {
  DEFAULT_REVIEW_RATE_CARD,
  NANO_PER_UNIT,
  calculateReviewCost,
  costLimitToNano,
  formatReviewCost,
  hasReviewPrices,
  sumReviewCosts,
  sumReviewUsage,
  toReviewDisplayAmount,
} from "../lib/review-cost.js";

const MODEL = "claude-opus-5";

describe("calculateReviewCost", () => {
  it("prices a million uncached input tokens at the published rate", () => {
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    expect(cost.totalNano).toBe((5n * NANO_PER_UNIT).toString());
    expect(cost.currency).toBe("USD");
    expect(cost.complete).toBe(true);
  });

  it("prices output higher than input", () => {
    const input = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    const output = calculateReviewCost({ inputTokens: 0, outputTokens: 1_000_000 }, MODEL);
    expect(BigInt(output.totalNano)).toBe(5n * BigInt(input.totalNano));
  });

  it("prices cached input at a tenth of the input rate", () => {
    const cached = calculateReviewCost(
      { inputTokens: 0, outputTokens: 0, cachedInputTokens: 1_000_000 },
      MODEL,
    );
    expect(cached.totalNano).toBe(500_000_000n.toString());
  });

  it("prices cache writes above the plain input rate", () => {
    const written = calculateReviewCost(
      { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 1_000_000 },
      MODEL,
    );
    expect(written.totalNano).toBe(6_250_000_000n.toString());
  });

  it("charges a cent per provider web search", () => {
    const searched = calculateReviewCost(
      { inputTokens: 0, outputTokens: 0, webSearchCalls: 100 },
      MODEL,
    );
    expect(searched.totalNano).toBe((1n * NANO_PER_UNIT).toString());
  });

  it("does not price reasoning tokens a second time", () => {
    const withReasoning = calculateReviewCost(
      { inputTokens: 0, outputTokens: 1000, reasoningTokens: 900 },
      MODEL,
    );
    const withoutReasoning = calculateReviewCost({ inputTokens: 0, outputTokens: 1000 }, MODEL);
    expect(withReasoning.totalNano).toBe(withoutReasoning.totalNano);
  });

  it("is deterministic for the same usage and rate card", () => {
    const usage = { inputTokens: 34_567, outputTokens: 8901, cachedInputTokens: 12_345 };
    const first = calculateReviewCost(usage, MODEL);
    const second = calculateReviewCost(usage, MODEL);
    expect(first.totalNano).toBe(second.totalNano);
    expect(first.rateCardVersion).toBe(DEFAULT_REVIEW_RATE_CARD.version);
  });

  it("marks a missing dimension incomplete instead of treating it as zero", () => {
    const cost = calculateReviewCost({ inputTokens: 1000 }, MODEL);
    expect(cost.complete).toBe(false);
    expect(cost.missingDimensions).toContain("outputTokens");
  });

  it("refuses to price an unknown model with another model's rates", () => {
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 1000 }, "made-up");
    expect(cost.totalNano).toBe("0");
    expect(cost.complete).toBe(false);
    expect(cost.missingDimensions).toContain("rateCard:made-up");
  });

  it("prices against an older rate card without changing the current one", () => {
    const older = {
      version: "test-2020",
      currency: "USD",
      effectiveFrom: "2020-01-01",
      displayCurrency: "EUR",
      displayRateNano: 1_000_000_000n,
      prices: {
        [MODEL]: {
          inputPerMillion: 1_000_000_000n,
          cacheWritePerMillion: 1_000_000_000n,
          cacheReadPerMillion: 1_000_000_000n,
          outputPerMillion: 1_000_000_000n,
          perWebSearch: 0n,
        },
      },
    };
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL, older);
    expect(cost.totalNano).toBe(NANO_PER_UNIT.toString());
    expect(cost.rateCardVersion).toBe("test-2020");
  });
});

describe("sumReviewUsage", () => {
  it("adds the dimensions every attempt reported", () => {
    const total = sumReviewUsage([
      { inputTokens: 100, outputTokens: 10, webSearchCalls: 1 },
      { inputTokens: 200, outputTokens: 20, webSearchCalls: 2 },
    ]);
    expect(total.inputTokens).toBe(300);
    expect(total.outputTokens).toBe(30);
    expect(total.webSearchCalls).toBe(3);
  });

  it("leaves a dimension absent when no attempt reported it", () => {
    const total = sumReviewUsage([{ inputTokens: 100 }, { inputTokens: 200 }]);
    expect(total.outputTokens).toBeUndefined();
  });
});

describe("sumReviewCosts", () => {
  it("adds the attempts of one check", () => {
    const first = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    const second = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    expect(sumReviewCosts([first, second]).totalNano).toBe((10n * NANO_PER_UNIT).toString());
  });

  it("carries an incomplete attempt into the total", () => {
    const complete = calculateReviewCost({ inputTokens: 1000, outputTokens: 10 }, MODEL);
    const partial = calculateReviewCost({ inputTokens: 1000 }, MODEL);
    const total = sumReviewCosts([complete, partial]);
    expect(total.complete).toBe(false);
    expect(total.missingDimensions).toContain("outputTokens");
  });

  it("refuses to silently add two currencies", () => {
    const usd = calculateReviewCost({ inputTokens: 1000, outputTokens: 10 }, MODEL);
    const eur = { ...usd, currency: "EUR" };
    const total = sumReviewCosts([usd, eur]);
    expect(total.complete).toBe(false);
    expect(total.missingDimensions).toContain("currency:EUR");
  });

  it("returns an empty complete total for no attempts", () => {
    const total = sumReviewCosts([]);
    expect(total.totalNano).toBe("0");
    expect(total.complete).toBe(true);
  });
});

describe("formatReviewCost", () => {
  it("marks an incomplete amount rather than printing a bare figure", () => {
    const partial = calculateReviewCost({ inputTokens: 1_000_000 }, MODEL);
    expect(formatReviewCost(partial)).toContain("unvollständig");
  });

  it("prints a complete amount in the display currency", () => {
    const complete = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    // Five dollars at the rate pinned in the card, rendered German-style.
    expect(formatReviewCost(complete)).toBe("4,3250 EUR");
  });
});

describe("toReviewDisplayAmount", () => {
  it("converts with the rate pinned in the card the amount was produced under", () => {
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    const display = toReviewDisplayAmount(cost);
    expect(display.currency).toBe("EUR");
    expect(display.totalNano).toBe(4_325_000_000n.toString());
  });

  it("leaves an amount alone when its rate card is unknown", () => {
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MODEL);
    const display = toReviewDisplayAmount({ ...cost, rateCardVersion: "gone" });
    expect(display.currency).toBe("USD");
    expect(display.totalNano).toBe(cost.totalNano);
  });

  it("converts a ceiling into the billed currency", () => {
    // Two euros at the pinned rate are more than two dollars, and the ceiling
    // is compared against amounts the provider billed in dollars.
    expect(costLimitToNano(2)).toBeGreaterThan(2n * NANO_PER_UNIT);
  });
});

describe("costLimitToNano", () => {
  it("round-trips a ceiling back to the entered amount", () => {
    const twoEuros = costLimitToNano(2);
    const backToEuros = toReviewDisplayAmount({
      totalNano: twoEuros.toString(),
      currency: "USD",
      rateCardVersion: DEFAULT_REVIEW_RATE_CARD.version,
      complete: true,
      missingDimensions: [],
    });
    expect(Number(backToEuros.totalNano) / Number(NANO_PER_UNIT)).toBeCloseTo(2, 6);
    expect(backToEuros.currency).toBe("EUR");
  });
});

describe("batch billing", () => {
  it("prices a batched run at half", () => {
    // The provider charges 50% of the standard prices for batched usage, so a
    // check recorded at the standard rate would overstate what was spent and
    // stop the worker at half the daily ceiling it was given.
    const usage = { inputTokens: 1_000_000, outputTokens: 0 };
    const standard = calculateReviewCost(usage, "claude-opus-5");
    const batched = calculateReviewCost(usage, "claude-opus-5", undefined, "batch");

    expect(BigInt(standard.totalNano)).toBe(5_000_000_000n);
    expect(BigInt(batched.totalNano)).toBe(BigInt(standard.totalNano) / 2n);
  });
});

describe("a second provider's rate card", () => {
  const MISTRAL_MODEL = "mistral-large-2512";

  it("prices a model against the card of the provider that publishes it", () => {
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MISTRAL_MODEL);

    // Half a dollar per million, against five for the Anthropic model above.
    expect(cost.totalNano).toBe((NANO_PER_UNIT / 2n).toString());
    expect(cost.rateCardVersion).toBe("mistral-2026-09-03");
    expect(cost.complete).toBe(true);
  });

  it("charges no surcharge for a cache write, unlike the other card", () => {
    const anthropic = calculateReviewCost({ cacheWriteTokens: 1_000_000 }, MODEL);
    const mistral = calculateReviewCost({ cacheWriteTokens: 1_000_000 }, MISTRAL_MODEL);

    const anthropicInput = calculateReviewCost({ inputTokens: 1_000_000 }, MODEL);
    const mistralInput = calculateReviewCost({ inputTokens: 1_000_000 }, MISTRAL_MODEL);

    // Anthropic publishes a quarter more for a write. Mistral publishes the
    // discount for reading and no surcharge for writing, so a write costs what
    // fresh input costs.
    expect(BigInt(anthropic.totalNano)).toBe((BigInt(anthropicInput.totalNano) * 125n) / 100n);
    expect(BigInt(mistral.totalNano)).toBe(BigInt(mistralInput.totalNano));
  });

  it("prices a search at the rate its own provider charges", () => {
    const anthropic = calculateReviewCost({ webSearchCalls: 1000 }, MODEL);
    const mistral = calculateReviewCost({ webSearchCalls: 1000 }, MISTRAL_MODEL);

    // Ten dollars per thousand against thirty. At four searches a check this is
    // the largest single item of a Mistral run.
    expect(anthropic.totalNano).toBe((10n * NANO_PER_UNIT).toString());
    expect(mistral.totalNano).toBe((30n * NANO_PER_UNIT).toString());
  });

  it("prices a run that reports no cached tokens as complete", () => {
    // Mistral reports a prompt token count and nothing that separates a cached
    // token from a fresh one. The absent cache figures are not a gap in what
    // was billed, so the amount is final rather than marked incomplete.
    const cost = calculateReviewCost(
      { inputTokens: 100_000, outputTokens: 20_000, webSearchCalls: 4 },
      MISTRAL_MODEL,
    );

    expect(cost.complete).toBe(true);
    expect(cost.missingDimensions).toEqual([]);
  });

  it("halves a batched amount on either card", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 0 };
    const standard = calculateReviewCost(usage, MISTRAL_MODEL);
    const batched = calculateReviewCost(usage, MISTRAL_MODEL, undefined, "batch");

    expect(BigInt(batched.totalNano)).toBe(BigInt(standard.totalNano) / 2n);
  });

  it("converts an amount with the rate its own card pinned", () => {
    const cost = calculateReviewCost({ inputTokens: 1_000_000, outputTokens: 0 }, MISTRAL_MODEL);
    const shown = toReviewDisplayAmount(cost);

    expect(shown.currency).toBe("EUR");
    expect(shown.totalNano).toBe(((NANO_PER_UNIT / 2n) * 865_000_000n / NANO_PER_UNIT).toString());
  });
});

describe("hasReviewPrices", () => {
  it("covers the models of both providers", () => {
    expect(hasReviewPrices("claude-opus-5")).toBe(true);
    expect(hasReviewPrices("mistral-large-2512")).toBe(true);
    expect(hasReviewPrices("mistral-medium-2604")).toBe(true);
  });

  it("rejects a model no card prices", () => {
    // Such a model would run, cost money, and be recorded at zero, which would
    // also let it pass the daily ceiling untouched. It is left out of the
    // settings instead.
    expect(hasReviewPrices("mistral-large-3")).toBe(false);
    expect(hasReviewPrices("made-up")).toBe(false);
  });
});
