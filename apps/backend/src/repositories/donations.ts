import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { type DonationInsert, type DonationRow, donations } from "../db/schema.js";

/** What a window of the ledger adds up to. */
export interface DonationSum {
  /** What arrived in that window, in cents. */
  cents: number;
  /** How many payments arrived in it. */
  count: number;
}

/**
 * Returns every payment, the most recent first.
 *
 * @param range - The days to include. Both ends count, and either may be left
 *   out to leave that side of the window open.
 */
export async function listDonations(
  range: { from?: string; to?: string } = {},
): Promise<DonationRow[]> {
  const bounds = [
    ...(range.from ? [gte(donations.receivedAt, range.from)] : []),
    ...(range.to ? [lte(donations.receivedAt, range.to)] : []),
  ];
  const query = db.select().from(donations);
  return bounds.length > 0
    ? query.where(and(...bounds)).orderBy(desc(donations.receivedAt))
    : query.orderBy(desc(donations.receivedAt));
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
  const bounds = [
    ...(range.from ? [gte(donations.receivedAt, range.from)] : []),
    ...(range.to ? [lte(donations.receivedAt, range.to)] : []),
  ];
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

/** Returns one payment, or `null` when none carries that identifier. */
export async function getDonation(id: string): Promise<DonationRow | null> {
  const [row] = await db.select().from(donations).where(eq(donations.id, id)).limit(1);
  return row ?? null;
}

/** Stores a new payment and returns it, including the identifier given. */
export async function insertDonation(data: DonationInsert): Promise<DonationRow> {
  const [created] = await db.insert(donations).values(data).returning();
  return created;
}

/** Updates one payment and returns it, or `null` when it no longer exists. */
export async function updateDonation(
  id: string,
  data: Partial<Omit<DonationInsert, "id">>,
): Promise<DonationRow | null> {
  const [updated] = await db.update(donations).set(data).where(eq(donations.id, id)).returning();
  return updated ?? null;
}

/** Removes one payment. */
export async function deleteDonation(id: string): Promise<boolean> {
  const removed = await db.delete(donations).where(eq(donations.id, id)).returning();
  return removed.length > 0;
}
