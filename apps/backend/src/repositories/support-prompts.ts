import { and, asc, desc, eq, isNull, lte, or, gte } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  type SupportPromptInsert,
  type SupportPromptRow,
  supportPrompts,
} from "../db/schema.js";

/**
 * Returns every prompt, newest first within a slot, for the dashboard list.
 */
export async function listSupportPrompts(): Promise<SupportPromptRow[]> {
  return db
    .select()
    .from(supportPrompts)
    .orderBy(asc(supportPrompts.slot), desc(supportPrompts.priority), desc(supportPrompts.createdAt));
}

/**
 * Returns one prompt, or `null` when no prompt carries that identifier.
 */
export async function getSupportPrompt(id: string): Promise<SupportPromptRow | null> {
  const [row] = await db.select().from(supportPrompts).where(eq(supportPrompts.id, id)).limit(1);
  return row ?? null;
}

/**
 * Returns the prompts a visitor may be shown today.
 *
 * Unpublished prompts never leave the server, because a prompt is rendered in
 * the reader's browser and a draft would otherwise be readable in the network
 * traffic. A prompt without a window is always current; one with a window is
 * current whilst `day` lies inside it.
 *
 * @param day - The day to test the windows against, as `YYYY-MM-DD`.
 * @returns The prompts in the order the site should prefer them.
 */
export async function listPublishedSupportPrompts(day: string): Promise<SupportPromptRow[]> {
  return db
    .select()
    .from(supportPrompts)
    .where(
      and(
        eq(supportPrompts.published, true),
        or(isNull(supportPrompts.startsAt), lte(supportPrompts.startsAt, day)),
        or(isNull(supportPrompts.endsAt), gte(supportPrompts.endsAt, day)),
      ),
    )
    .orderBy(asc(supportPrompts.slot), desc(supportPrompts.priority), desc(supportPrompts.createdAt));
}

/**
 * Stores a new prompt and returns it, including the identifier it was given.
 */
export async function insertSupportPrompt(data: SupportPromptInsert): Promise<SupportPromptRow> {
  const [created] = await db.insert(supportPrompts).values(data).returning();
  return created;
}

/**
 * Updates one prompt and returns it, or `null` when it no longer exists.
 *
 * The identifier is never part of an update: the counters in a reader's browser
 * are keyed by it, so changing it would reset everybody.
 */
export async function updateSupportPrompt(
  id: string,
  data: Partial<Omit<SupportPromptInsert, "id">>,
): Promise<SupportPromptRow | null> {
  const [updated] = await db
    .update(supportPrompts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(supportPrompts.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Removes one prompt.
 *
 * @returns `true` when a prompt was removed, `false` when none carried that
 *   identifier.
 */
export async function deleteSupportPrompt(id: string): Promise<boolean> {
  const removed = await db.delete(supportPrompts).where(eq(supportPrompts.id, id)).returning();
  return removed.length > 0;
}
