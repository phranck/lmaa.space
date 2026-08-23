import { asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  type PendingSponsorshipInsert,
  type PendingSponsorshipRow,
  pendingSponsorships,
} from "../db/schema.js";

/**
 * Stores one pending sponsorship and returns the row as it was written.
 *
 * @param data - The entry, including the reference it will be paid under.
 * @returns The stored row, so the caller reads back what the database holds
 *   rather than what it meant to store.
 * @throws Whatever the driver raises, including a unique violation when the
 *   reference is already taken. The caller decides what to do about that.
 */
export async function insertPendingSponsorship(
  data: PendingSponsorshipInsert,
): Promise<PendingSponsorshipRow> {
  const [created] = await db.insert(pendingSponsorships).values(data).returning();
  return created;
}

/**
 * Rewrites what somebody said about themselves, keeping their reference.
 *
 * The reference may already stand in a banking app by the time this runs, so it
 * is the one thing an update never touches.
 *
 * @param reference - The reference as it is stored, without spaces, upper case.
 * @param data - The fields to write.
 * @returns The row afterwards, or `null` when no entry carries that reference.
 */
export async function updatePendingSponsorshipByReference(
  reference: string,
  data: Omit<PendingSponsorshipInsert, "id" | "reference" | "createdAt">,
): Promise<PendingSponsorshipRow | null> {
  const [updated] = await db
    .update(pendingSponsorships)
    .set(data)
    .where(eq(pendingSponsorships.reference, reference))
    .returning();
  return updated ?? null;
}

/**
 * Returns every entry nobody has turned into a sponsor yet, oldest first.
 *
 * Oldest first, because that one is both the likeliest to have been paid by now
 * and the closest to being removed unclaimed.
 */
export async function listPendingSponsorships(): Promise<PendingSponsorshipRow[]> {
  return db.select().from(pendingSponsorships).orderBy(asc(pendingSponsorships.createdAt));
}

/**
 * Returns one entry, or `null` when none carries that identifier.
 *
 * @param id - The identifier of the entry.
 */
export async function getPendingSponsorship(id: string): Promise<PendingSponsorshipRow | null> {
  const [row] = await db
    .select()
    .from(pendingSponsorships)
    .where(eq(pendingSponsorships.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Removes one entry.
 *
 * @param id - The identifier of the entry.
 * @returns `true` when a row was removed, `false` when it was already gone.
 */
export async function deletePendingSponsorship(id: string): Promise<boolean> {
  const removed = await db
    .delete(pendingSponsorships)
    .where(eq(pendingSponsorships.id, id))
    .returning({ id: pendingSponsorships.id });
  return removed.length > 0;
}
