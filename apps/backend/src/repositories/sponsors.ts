import { desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { type SponsorInsert, type SponsorRow, donations, sponsors } from "../db/schema.js";

/** A sponsor together with what the ledger says they have given. */
export type SponsorWithAmount = SponsorRow & { amountCents: number };

/**
 * What each sponsor has been paid, as a subquery to join against.
 *
 * Built per call rather than shared as a constant, because a Drizzle subquery
 * carries its own alias and reusing one instance across two queries in flight
 * at the same time is not something to rely on.
 */
function paidPerSponsor() {
  return db
    .select({
      sponsorId: donations.sponsorId,
      cents: sql<number>`coalesce(sum(${donations.amountCents}), 0)::int`.as("cents"),
    })
    .from(donations)
    .where(isNotNull(donations.sponsorId))
    .groupBy(donations.sponsorId)
    .as("paid");
}

/**
 * Returns every sponsor, the most recent payment first, with what they gave.
 *
 * The amount is summed from the payments linked to them rather than stored on
 * the sponsor, because the ledger is the only place a payment is recorded. A
 * sponsor who has renewed carries several, and this is their total.
 */
export async function listSponsors(): Promise<SponsorWithAmount[]> {
  const paid = paidPerSponsor();

  const rows = await db
    .select({ sponsor: sponsors, cents: paid.cents })
    .from(sponsors)
    .leftJoin(paid, eq(paid.sponsorId, sponsors.id))
    .orderBy(desc(sponsors.paidAt));

  // Zero rather than nothing for a sponsor with no payment linked yet, so the
  // dashboard shows a figure it can add up instead of an empty cell.
  return rows.map((row) => ({ ...row.sponsor, amountCents: row.cents ?? 0 }));
}

/**
 * Returns the sponsors whose year has not run out.
 *
 * A sponsorship runs from the day it was paid, so the cut-off is simply a year
 * before today. Nothing rolls over at the turn of the year and nothing has to
 * be archived: a sponsor drops out on their own anniversary.
 *
 * @param since - The earliest payment day still counted, as `YYYY-MM-DD`.
 * @returns The current sponsors, in the order they paid.
 */
export async function listCurrentSponsors(since: string): Promise<SponsorRow[]> {
  return db.select().from(sponsors).where(gte(sponsors.paidAt, since)).orderBy(sponsors.paidAt);
}

/**
 * Returns one sponsor with what they gave, or `null` when there is no such one.
 *
 * Carries the amount for the same reason the list does: a caller asking for one
 * sponsor gets the shape it gets for all of them, so `Sponsor` means one thing.
 */
export async function getSponsor(id: string): Promise<SponsorWithAmount | null> {
  const paid = paidPerSponsor();

  const [row] = await db
    .select({ sponsor: sponsors, cents: paid.cents })
    .from(sponsors)
    .leftJoin(paid, eq(paid.sponsorId, sponsors.id))
    .where(eq(sponsors.id, id))
    .limit(1);

  return row ? { ...row.sponsor, amountCents: row.cents ?? 0 } : null;
}

/**
 * Stores a new sponsor and returns them, including the identifier given.
 *
 * The amount is zero by construction: nothing can be linked to a sponsor that
 * did not exist a moment ago, and the payment is written separately.
 */
export async function insertSponsor(data: SponsorInsert): Promise<SponsorWithAmount> {
  const [created] = await db.insert(sponsors).values(data).returning();
  return { ...created, amountCents: 0 };
}

/**
 * Updates one sponsor and returns them, or `null` when they no longer exist.
 *
 * Read back rather than returned from the write, because the amount is summed
 * from the ledger and an `UPDATE ... RETURNING` on this table cannot know it.
 */
export async function updateSponsor(
  id: string,
  data: Partial<Omit<SponsorInsert, "id">>,
): Promise<SponsorWithAmount | null> {
  const [updated] = await db
    .update(sponsors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(sponsors.id, id))
    .returning();
  return updated ? await getSponsor(updated.id) : null;
}

/** Removes one sponsor. */
export async function deleteSponsor(id: string): Promise<boolean> {
  const removed = await db.delete(sponsors).where(eq(sponsors.id, id)).returning();
  return removed.length > 0;
}
