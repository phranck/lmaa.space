import type { DonationTotals } from "@lmaa/contracts";
import { DONATION_MONTH_DAYS, SPONSOR_YEAR_DAYS, periodStart } from "@lmaa/shared";

import { sumDonations } from "../repositories/donations.js";

/**
 * Returns what came in over the periods the dashboard shows at a glance.
 *
 * Both windows roll back from the given day rather than following the calendar,
 * which is what the sponsor year does as well. One idea of a period across the
 * set, so the month and the year beside it mean the same kind of thing.
 *
 * @param today - The day to count back from, as `YYYY-MM-DD`. Passed in rather
 *   than read from the clock, so the figures can be asserted in a test.
 * @returns The month, the year, and how many payments fall into that year.
 */
export async function getDonationTotals(today: string): Promise<DonationTotals> {
  const [month, year] = await Promise.all([
    sumDonations({ from: periodStart(today, DONATION_MONTH_DAYS), to: today }),
    sumDonations({ from: periodStart(today, SPONSOR_YEAR_DAYS), to: today }),
  ]);

  return {
    monthCents: month.cents,
    yearCents: year.cents,
    yearCount: year.count,
  };
}
