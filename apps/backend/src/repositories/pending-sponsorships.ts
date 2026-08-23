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
