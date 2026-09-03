import { and, desc, eq, gte, isNull, isNotNull, lte, sql } from "drizzle-orm";

import type { DonationBucket, DonationOrigin } from "@lmaa/contracts";

import { db } from "../db/client.js";
import { type DonationInsert, type DonationRow, donations } from "../db/schema.js";

/**
 * A payment as anything outside this module sees it.
 *
 * `external_ref` is replaced by what it answers. The identifier belongs to the
 * bank account rather than to the ledger, and nothing above needs it, so it
 * stops here and cannot reach a response by somebody forgetting to strip it.
 */
export interface DonationView extends Omit<DonationRow, "externalRef"> {
  /** Whether a person entered this payment or the site read it from the bank. */
  origin: DonationOrigin;
}

/**
 * Turns a stored row into what the rest of the backend works with.
 *
 * @param row - The row as the database holds it.
 * @returns The same payment, with the bank's identifier answered rather than
 *   carried.
 */
function toView({ externalRef, ...row }: DonationRow): DonationView {
  return { ...row, origin: externalRef === null ? "manual" : "bank" };
}

/** What a window of the ledger adds up to. */
export interface DonationSum {
  /** What arrived in that window, in cents. */
  cents: number;
  /** How many payments arrived in it. */
  count: number;
}

/**
 * The window as a list of conditions, empty where both ends are open.
 *
 * Every read of the ledger takes the same window, so the two comparisons live
 * here rather than in each of them. A day is stored as `YYYY-MM-DD` text, which
 * sorts as a date does, so the bounds are ordinary string comparisons.
 */
function windowBounds(range: { from?: string; to?: string }) {
  return [
    ...(range.from ? [gte(donations.receivedAt, range.from)] : []),
    ...(range.to ? [lte(donations.receivedAt, range.to)] : []),
  ];
}

/**
 * Returns every payment, the most recent first.
 *
 * @param range - The days to include, both ends counting and either side able
 *   to stay open, and optionally one origin. Left out, both origins are listed
 *   together.
 */
export async function listDonations(
  range: { from?: string; to?: string; origin?: DonationOrigin } = {},
): Promise<DonationView[]> {
  const bounds = [
    ...windowBounds(range),
    // Whether the row carries the bank's identifier is the whole of what the
    // origin is, so the filter asks the column rather than a second flag.
    ...(range.origin === "bank" ? [isNotNull(donations.externalRef)] : []),
    ...(range.origin === "manual" ? [isNull(donations.externalRef)] : []),
  ];
  const query = db.select().from(donations);
  const rows = await (bounds.length > 0
    ? query.where(and(...bounds)).orderBy(desc(donations.receivedAt))
    : query.orderBy(desc(donations.receivedAt)));
  return rows.map(toView);
}

/**
 * Returns what a window of the ledger adds up to.
 *
 * Summed in the database rather than over a fetched list, because the caller
 * wants the figure and not the payments, and the list grows without limit.
 *
 * @param range - The days to include. Both ends count, and either may be left
 *   out to leave that side of the window open.
 * @returns The sum in cents and how many payments it covers. An empty window
 *   gives zero for both rather than nothing.
 */
export async function sumDonations(
  range: { from?: string; to?: string } = {},
): Promise<DonationSum> {
  const bounds = windowBounds(range);
  const selection = {
    // Coalesced here rather than in the caller, because an empty window makes
    // Postgres answer null and a null read as a euro figure is a wrong figure.
    cents: sql<number>`coalesce(sum(${donations.amountCents}), 0)::int`,
    count: sql<number>`count(*)::int`,
  };
  const query = db.select(selection).from(donations);
  const [row] = await (bounds.length > 0 ? query.where(and(...bounds)) : query);
  return row ?? { cents: 0, count: 0 };
}

/** What one period of the ledger holds, as the database groups it. */
export interface DonationPeriodRow {
  /** The first day of the period, as `YYYY-MM-DD`. */
  start: string;
  /** What came in through sponsorships over it, in cents. */
  sponsorCents: number;
  /** What came in without paying for a sponsorship, in cents. */
  donationCents: number;
  /** How many payments the two amounts are made of. */
  count: number;
}

/** What one payment route carried over a window. */
export interface DonationProviderRow {
  /** Which route, as a key of `DONATION_PROVIDERS`. */
  provider: string;
  /** What arrived through it, in cents. */
  cents: number;
  /** How many payments took it. */
  count: number;
}

/**
 * Cuts a stored day down to the first day of the period it falls in.
 *
 * `received_at` holds a day as `YYYY-MM-DD` text, so a month is the first seven
 * characters with the first of the month put back on. That keeps the grouping
 * on the same string the column already is, with no cast to a date and no time
 * zone to get wrong, and it is the same cut the caller makes when it builds the
 * axis these rows are placed on.
 */
function periodExpression(bucket: DonationBucket) {
  return bucket === "month"
    ? sql<string>`substring(${donations.receivedAt} from 1 for 7) || '-01'`
    : sql<string>`${donations.receivedAt}`;
}

/**
 * Returns what came in per period, split by whether it paid for a sponsorship.
 *
 * Only the periods something arrived in come back. Filling the empty ones is
 * the caller's work, because the caller is what knows how far the window
 * reaches when neither end was given.
 *
 * @param range - The days to include. Both ends count, and either may be left
 *   out to leave that side of the window open.
 * @param bucket - How wide one period is.
 * @returns One row per period that carried money, oldest first.
 */
export async function listDonationPeriods(
  range: { from?: string; to?: string },
  bucket: DonationBucket,
): Promise<DonationPeriodRow[]> {
  const period = periodExpression(bucket);
  const selection = {
    start: sql<string>`${period}`.as("start"),
    // Filtered rather than summed over two queries, so both halves are counted
    // against exactly the same rows. `sponsor_id` is the only thing that tells
    // a sponsorship payment from a free one.
    sponsorCents: sql<number>`coalesce(sum(${donations.amountCents}) filter (where ${donations.sponsorId} is not null), 0)::int`,
    donationCents: sql<number>`coalesce(sum(${donations.amountCents}) filter (where ${donations.sponsorId} is null), 0)::int`,
    count: sql<number>`count(*)::int`,
  };
  const bounds = windowBounds(range);
  const query = db.select(selection).from(donations);
  return bounds.length > 0
    ? query
        .where(and(...bounds))
        .groupBy(period)
        .orderBy(period)
    : query.groupBy(period).orderBy(period);
}

/**
 * Returns what each payment route carried over a window, largest first.
 *
 * A route nothing came through is absent rather than zero: the chart names the
 * routes on its axis, and a row of empty labels says nothing a reader wants.
 *
 * @param range - The days to include. Both ends count, and either may be left
 *   out to leave that side of the window open.
 * @returns One row per route that carried money.
 */
export async function listDonationProviders(
  range: { from?: string; to?: string } = {},
): Promise<DonationProviderRow[]> {
  const cents = sql<number>`coalesce(sum(${donations.amountCents}), 0)::int`;
  const selection = {
    provider: donations.provider,
    cents: cents.as("cents"),
    count: sql<number>`count(*)::int`,
  };
  const bounds = windowBounds(range);
  const query = db.select(selection).from(donations);
  return bounds.length > 0
    ? query
        .where(and(...bounds))
        .groupBy(donations.provider)
        .orderBy(desc(cents))
    : query.groupBy(donations.provider).orderBy(desc(cents));
}

/** Returns one payment, or `null` when none carries that identifier. */
export async function getDonation(id: string): Promise<DonationView | null> {
  const [row] = await db.select().from(donations).where(eq(donations.id, id)).limit(1);
  return row ? toView(row) : null;
}

/**
 * Stores a new payment and returns it, including the identifier given.
 *
 * @throws Whatever the driver raises, including a unique violation when the
 *   bank's identifier is already in the ledger. That is how a second read of
 *   the same entry is recognised, so the caller decides what to do about it.
 */
export async function insertDonation(data: DonationInsert): Promise<DonationView> {
  const [created] = await db.insert(donations).values(data).returning();
  return toView(created);
}

/** Updates one payment and returns it, or `null` when it no longer exists. */
export async function updateDonation(
  id: string,
  data: Partial<Omit<DonationInsert, "id">>,
): Promise<DonationView | null> {
  const [updated] = await db.update(donations).set(data).where(eq(donations.id, id)).returning();
  return updated ? toView(updated) : null;
}

/** Removes one payment. */
export async function deleteDonation(id: string): Promise<boolean> {
  const removed = await db.delete(donations).where(eq(donations.id, id)).returning();
  return removed.length > 0;
}
