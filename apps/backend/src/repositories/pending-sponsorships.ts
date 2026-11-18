import { type SQL, asc, eq, lt } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  type PendingSponsorshipInsert,
  type PendingSponsorshipRow,
  pendingSponsorships,
  retiredSponsorshipReferences,
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
 * Returns the entry a reference was issued for, or `null` when none was.
 *
 * @param reference - The reference as it is stored, without spaces, upper case.
 */
export async function getPendingSponsorshipByReference(
  reference: string,
): Promise<PendingSponsorshipRow | null> {
  const [row] = await db
    .select()
    .from(pendingSponsorships)
    .where(eq(pendingSponsorships.reference, reference))
    .limit(1);
  return row ?? null;
}

/**
 * Says whether this project issued a reference, whatever became of its entry.
 *
 * @param reference - The reference as it is stored, without spaces, upper case.
 * @returns `true` when an entry still carries it or `retired_sponsorship_references`
 *   holds it, `false` when this project never issued it.
 */
export async function wasSponsorshipReferenceIssued(reference: string): Promise<boolean> {
  if (await getPendingSponsorshipByReference(reference)) return true;

  const [retired] = await db
    .select({ reference: retiredSponsorshipReferences.reference })
    .from(retiredSponsorshipReferences)
    .where(eq(retiredSponsorshipReferences.reference, reference))
    .limit(1);
  return Boolean(retired);
}

/**
 * Deletes the entries a condition selects and keeps their references.
 *
 * Every way an entry leaves goes through here, so no reference this project
 * issued is forgotten. Both writes share one transaction: an entry never goes
 * without its reference being kept, and a reference is never kept for an entry
 * that stayed.
 *
 * @param where - Which entries to delete.
 * @returns How many were deleted.
 */
async function retirePendingSponsorships(where: SQL): Promise<number> {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(pendingSponsorships)
      .where(where)
      .returning({ reference: pendingSponsorships.reference });
    if (removed.length > 0) {
      await tx.insert(retiredSponsorshipReferences).values(removed).onConflictDoNothing();
    }
    return removed.length;
  });
}

/**
 * Removes every entry announced before the given moment, keeping its reference.
 *
 * @param before - Entries created earlier than this are removed.
 * @returns How many were removed, which is what the log line reports.
 */
export async function deletePendingSponsorshipsBefore(before: Date): Promise<number> {
  return retirePendingSponsorships(lt(pendingSponsorships.createdAt, before));
}

/**
 * Removes one entry, keeping its reference.
 *
 * @param id - The identifier of the entry.
 * @returns `true` when a row was removed, `false` when it was already gone.
 */
export async function deletePendingSponsorship(id: string): Promise<boolean> {
  return (await retirePendingSponsorships(eq(pendingSponsorships.id, id))) > 0;
}
