import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "../db/client.js";
import { type BackgroundError, backgroundErrors } from "../db/schema.js";

export async function insertBackgroundError(input: {
  source: string;
  message: string;
  context: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(backgroundErrors).values(input);
}

export async function listBackgroundErrors(opts: {
  resolved?: boolean;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<BackgroundError[]> {
  const { resolved, source, limit = 100, offset = 0 } = opts;

  const conditions = [];
  if (resolved === true) conditions.push(isNotNull(backgroundErrors.resolvedAt));
  if (resolved === false) conditions.push(isNull(backgroundErrors.resolvedAt));
  if (source) conditions.push(eq(backgroundErrors.source, source));

  const query = db
    .select()
    .from(backgroundErrors)
    .orderBy(desc(backgroundErrors.occurredAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length === 0) return query;
  return query.where(and(...conditions));
}

export async function resolveBackgroundError(
  id: number,
  adminId: number,
): Promise<BackgroundError | null> {
  const result = await db
    .update(backgroundErrors)
    .set({ resolvedAt: new Date(), resolvedBy: adminId })
    .where(eq(backgroundErrors.id, id))
    .returning();
  return result[0] ?? null;
}

export async function deleteBackgroundError(id: number): Promise<BackgroundError | null> {
  const result = await db.delete(backgroundErrors).where(eq(backgroundErrors.id, id)).returning();
  return result[0] ?? null;
}
