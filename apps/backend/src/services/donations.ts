import {
  DONATION_PROVIDER_KEYS,
  type DonationBreakdown,
  type DonationBucket,
  type DonationProvider,
  type DonationTotals,
  donationBucketFor,
} from "@lmaa/contracts";
import { DONATION_MONTH_DAYS, SPONSOR_YEAR_DAYS, periodStart } from "@lmaa/shared";

import {
  listDonationPeriods,
  listDonationProviders,
  sumDonations,
} from "../repositories/donations.js";

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

/**
 * Cuts a day down to the first day of the period it falls in.
 *
 * The same cut the database makes when it groups, on the same `YYYY-MM-DD`
 * text, so a row the query produced always lands on an entry of the axis built
 * here rather than beside it.
 */
function periodStartOf(day: string, bucket: DonationBucket): string {
  return bucket === "month" ? `${day.slice(0, 7)}-01` : day;
}

/** The period after the given one. */
function nextPeriodStart(start: string, bucket: DonationBucket): string {
  const day = new Date(`${start}T00:00:00Z`);
  if (bucket === "month") day.setUTCMonth(day.getUTCMonth() + 1);
  else day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/**
 * Every period from the first to the last, with nothing left out.
 *
 * A period nothing came in over is still part of the window, and a chart that
 * omits it puts two bars side by side that are months apart. Empty where the
 * window runs backwards.
 */
function periodAxis(first: string, last: string, bucket: DonationBucket): string[] {
  // Checked before either end is cut down to its period, because two days in
  // one month cut to the same first of the month and a window running from the
  // 31st back to the 1st would then read as a window of one month.
  if (first > last) return [];
  const end = periodStartOf(last, bucket);
  const axis: string[] = [];
  for (
    let current = periodStartOf(first, bucket);
    current <= end;
    current = nextPeriodStart(current, bucket)
  ) {
    axis.push(current);
  }
  return axis;
}

/**
 * Names the route a stored payment took.
 *
 * A key the contract no longer lists falls to `other`, which is the bucket that
 * exists for exactly this. Casting instead would hand the dashboard a key it
 * has no label for, and the chart would draw a bar with a blank name.
 */
function knownProvider(provider: string): DonationProvider {
  return DONATION_PROVIDER_KEYS.includes(provider as DonationProvider)
    ? (provider as DonationProvider)
    : "other";
}

/**
 * Returns the ledger grouped into periods and payment routes, which is what a
 * chart draws.
 *
 * The period size follows from the window rather than from the request, per
 * `donationBucketFor`, so the length of the answer is bounded by the route
 * rather than chosen by the caller.
 *
 * @param range - The days to include. Both ends count, and either may be left
 *   out, in which case the axis reaches as far as the ledger does on that side.
 * @param today - The day an open upper end reaches to, as `YYYY-MM-DD`. Passed
 *   in rather than read from the clock, so the figures can be asserted.
 * @returns Every period in the window including the empty ones, every route
 *   that carried money largest first, and what the window adds up to.
 */
export async function getDonationBreakdown(
  range: { from?: string; to?: string },
  today: string,
): Promise<DonationBreakdown> {
  const bucket = donationBucketFor(range.from, range.to);
  const [rows, providers] = await Promise.all([
    listDonationPeriods(range, bucket),
    listDonationProviders(range),
  ]);

  // Where an end was left open, the ledger itself says how far the axis
  // reaches. An empty ledger leaves it empty rather than inventing a window.
  const first = range.from ?? rows[0]?.start;
  const last = range.to ?? rows[rows.length - 1]?.start ?? today;
  const byPeriod = new Map(rows.map((row) => [row.start, row]));

  const periods = (first ? periodAxis(first, last, bucket) : []).map((start) => {
    const row = byPeriod.get(start);
    return {
      start,
      sponsorCents: row?.sponsorCents ?? 0,
      donationCents: row?.donationCents ?? 0,
      count: row?.count ?? 0,
    };
  });

  // Totalled from the same rows the periods are built from, so the figure above
  // a chart and the bars in it cannot describe different money.
  const totals = rows.reduce(
    (sum, row) => ({
      cents: sum.cents + row.sponsorCents + row.donationCents,
      count: sum.count + row.count,
      sponsorCents: sum.sponsorCents + row.sponsorCents,
    }),
    { cents: 0, count: 0, sponsorCents: 0 },
  );

  // Folded by name, because anything `knownProvider` sends to `other` joins
  // whatever was already filed there, and the chart would otherwise draw that
  // route twice with the same label.
  const byProvider = new Map<DonationProvider, { cents: number; count: number }>();
  for (const row of providers) {
    const provider = knownProvider(row.provider);
    const sofar = byProvider.get(provider) ?? { cents: 0, count: 0 };
    byProvider.set(provider, { cents: sofar.cents + row.cents, count: sofar.count + row.count });
  }

  return {
    bucket,
    periods,
    providers: [...byProvider]
      .map(([provider, sums]) => ({ provider, ...sums }))
      .sort((left, right) => right.cents - left.cents),
    totalCents: totals.cents,
    totalCount: totals.count,
    sponsorCents: totals.sponsorCents,
  };
}
