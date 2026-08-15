import { describe, expect, it } from "vitest";

import {
  CURRENT_REVIEW_RATE_CARD,
  NANO_PER_UNIT,
  calculateReviewCost,
  costLimitToNano,
  formatReviewCost,
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
    expect(first.rateCardVersion).toBe(CURRENT_REVIEW_RATE_CARD.version);
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
      rateCardVersion: CURRENT_REVIEW_RATE_CARD.version,
      complete: true,
      missingDimensions: [],
    });
    expect(Number(backToEuros.totalNano) / Number(NANO_PER_UNIT)).toBeCloseTo(2, 6);
    expect(backToEuros.currency).toBe("EUR");
  });
});
