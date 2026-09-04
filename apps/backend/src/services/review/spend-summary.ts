import type { ReviewCost } from "@lmaa/shared";

import {
  DEFAULT_REVIEW_RATE_CARD,
  NANO_PER_UNIT,
  toReviewDisplayAmount,
} from "../../lib/review-cost.js";
import { readReviewSpendTotals } from "../../repositories/review-jobs.js";

/** Cents per whole currency unit. */
const CENTS_PER_UNIT = 100n;

/**
 * What the automation has cost, in the shapes the two readers need.
 */
export interface ReviewSpendSummary {
  /** Everything the ledger holds. */
  total: ReviewCost;
  /** What of it was spent on the current UTC day. */
  today: ReviewCost;
  /** The total divided by the number of checks it covers. */
  average: ReviewCost;
  /** How many distinct checks the average is taken over. */
  checkCount: number;
}

/**
 * Reads what the automation has cost in total, today and per check.
 *
 * @returns The three amounts, each converted into the currency they are shown
 * in, and the number of checks behind the average.
 *
 * @remarks
 * One function for both readers. The dashboard shows all three and the public
 * sponsors payload carries the average, and a second division somewhere else
 * would eventually disagree with this one whilst nothing said which figure to
 * believe.
 *
 * The average is a plain division of the total by the number of checks, so a
 * reader who divides the two figures on screen arrives at the third. That is
 * why probe runs count here exactly as they count in the total.
 */
export async function readReviewSpendSummary(): Promise<ReviewSpendSummary> {
  const totals = await readReviewSpendTotals();

  // Integer division, because the amounts are counted in nano-units and a
  // billionth of a currency unit is below anything that is read or billed.
  const averageNano = totals.checkCount > 0 ? totals.totalNano / BigInt(totals.checkCount) : 0n;

  const shown = (amountNano: bigint): ReviewCost => {
    const cost: ReviewCost = {
      totalNano: amountNano.toString(),
      currency: totals.currency,
      rateCardVersion: DEFAULT_REVIEW_RATE_CARD.version,
      complete: totals.complete,
      missingDimensions: [],
    };
    const display = toReviewDisplayAmount(cost);
    return { ...cost, displayTotalNano: display.totalNano, displayCurrency: display.currency };
  };

  return {
    total: shown(totals.totalNano),
    today: shown(totals.todayNano),
    average: shown(averageNano),
    checkCount: totals.checkCount,
  };
}

/**
 * The average cost of one check, as whole cents of the display currency.
 *
 * @param summary - What {@link readReviewSpendSummary} returned.
 * @returns The average in cents, rounded down, and `0` whilst nothing has been
 * billed.
 *
 * @remarks
 * Rounded down rather than to the nearest, so the figure a page prints is never
 * above what was actually spent. The shown amount is used rather than the
 * billed one, because the site reads in euro and the rate card pinned the
 * conversion when the check finished.
 */
export function averageReviewCostCents(summary: ReviewSpendSummary): number {
  const nano = BigInt(summary.average.displayTotalNano ?? summary.average.totalNano);
  return Number((nano * CENTS_PER_UNIT) / NANO_PER_UNIT);
}
