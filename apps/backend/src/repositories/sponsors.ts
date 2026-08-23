import { desc, eq, gte } from "drizzle-orm";

import { db } from "../db/client.js";
import { type SponsorInsert, type SponsorRow, sponsors } from "../db/schema.js";

/**
 * Returns every sponsor, the most recent payment first.
 */
export async function listSponsors(): Promise<SponsorRow[]> {
  return db.select().from(sponsors).orderBy(desc(sponsors.paidAt));
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

/** Returns one sponsor, or `null` when none carries that identifier. */
export async function getSponsor(id: string): Promise<SponsorRow | null> {
  const [row] = await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1);
  return row ?? null;
}

/** Stores a new sponsor and returns them, including the identifier given. */
export async function insertSponsor(data: SponsorInsert): Promise<SponsorRow> {
  const [created] = await db.insert(sponsors).values(data).returning();
  return created;
}

/** Updates one sponsor and returns them, or `null` when they no longer exist. */
export async function updateSponsor(
  id: string,
  data: Partial<Omit<SponsorInsert, "id">>,
): Promise<SponsorRow | null> {
  const [updated] = await db
    .update(sponsors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(sponsors.id, id))
    .returning();
  return updated ?? null;
}

/** Removes one sponsor. */
export async function deleteSponsor(id: string): Promise<boolean> {
  const removed = await db.delete(sponsors).where(eq(sponsors.id, id)).returning();
  return removed.length > 0;
}
