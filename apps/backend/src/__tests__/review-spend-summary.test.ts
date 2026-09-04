import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  readReviewSpendTotals: vi.fn(),
}));

vi.mock("../repositories/review-jobs.js", () => repository);

import {
  averageReviewCostCents,
  readReviewSpendSummary,
} from "../services/review/spend-summary.js";

/** What the ledger reports, in the shape the repository returns it. */
function totals(overrides: Record<string, unknown> = {}) {
  return {
    totalNano: 18_854_961_275n,
    todayNano: 0n,
    checkCount: 32,
    currency: "USD",
    complete: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.readReviewSpendTotals.mockResolvedValue(totals());
});

describe("readReviewSpendSummary", () => {
  it("divides the total by the number of checks rather than by the attempts", async () => {
    // 18.854961275 USD over 32 checks. The ledger holds more rows than that,
    // because a retried check spent twice whilst still being one check.
    const summary = await readReviewSpendSummary();

    expect(summary.average.totalNano).toBe("589217539");
    expect(summary.checkCount).toBe(32);
  });

  it("converts the average with the rate the card pinned", async () => {
    // 0.589217539 USD at the card's 0.865 EUR per USD.
    const summary = await readReviewSpendSummary();

    expect(summary.average.displayCurrency).toBe("EUR");
    expect(summary.average.displayTotalNano).toBe("509673171");
  });

  it("reports nothing per check whilst nothing has been billed", async () => {
    repository.readReviewSpendTotals.mockResolvedValue(totals({ totalNano: 0n, checkCount: 0 }));

    const summary = await readReviewSpendSummary();

    expect(summary.average.totalNano).toBe("0");
  });

  it("carries the ledger's incompleteness into all three amounts", async () => {
    // A missing billable dimension makes every figure derived from it a floor,
    // and the average is derived from the total.
    repository.readReviewSpendTotals.mockResolvedValue(totals({ complete: false }));

    const summary = await readReviewSpendSummary();

    expect(summary.total.complete).toBe(false);
    expect(summary.average.complete).toBe(false);
  });
});

describe("averageReviewCostCents", () => {
  it("reads the shown amount as whole cents", async () => {
    // 0.509673171 EUR, which the support page rounds down to 50 cents.
    expect(averageReviewCostCents(await readReviewSpendSummary())).toBe(50);
  });

  it("truncates rather than rounds, so the figure stays at or below what was spent", async () => {
    repository.readReviewSpendTotals.mockResolvedValue(
      totals({ totalNano: 999_000_000n, checkCount: 1 }),
    );

    // 0.999 USD is 0.864135 EUR, and 86 cents is below it whilst 87 is not.
    expect(averageReviewCostCents(await readReviewSpendSummary())).toBe(86);
  });

  it("answers an empty ledger with nothing", async () => {
    repository.readReviewSpendTotals.mockResolvedValue(totals({ totalNano: 0n, checkCount: 0 }));

    expect(averageReviewCostCents(await readReviewSpendSummary())).toBe(0);
  });
});
