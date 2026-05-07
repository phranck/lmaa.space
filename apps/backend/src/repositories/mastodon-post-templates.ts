import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type MastodonPostTemplate,
  type MastodonPostTemplateInsert,
  mastodonPostTemplates,
} from "../db/schema.js";

export async function listMastodonPostTemplates(): Promise<MastodonPostTemplate[]> {
  return db.select().from(mastodonPostTemplates).orderBy(mastodonPostTemplates.name);
}

export async function getMastodonPostTemplateById(
  id: number,
): Promise<MastodonPostTemplate | null> {
  const [row] = await db
    .select()
    .from(mastodonPostTemplates)
    .where(eq(mastodonPostTemplates.id, id))
    .limit(1);
  return row ?? null;
}

export async function getMastodonPostTemplateByName(
  name: string,
): Promise<MastodonPostTemplate | null> {
  const [row] = await db
    .select()
    .from(mastodonPostTemplates)
    .where(eq(mastodonPostTemplates.name, name))
    .limit(1);
  return row ?? null;
}

export async function insertMastodonPostTemplate(
  data: MastodonPostTemplateInsert,
): Promise<MastodonPostTemplate> {
  const [created] = await db.insert(mastodonPostTemplates).values(data).returning();
  return created;
}

export async function updateMastodonPostTemplate(
  id: number,
  data: Partial<MastodonPostTemplateInsert>,
): Promise<MastodonPostTemplate | null> {
  const [updated] = await db
    .update(mastodonPostTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mastodonPostTemplates.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteMastodonPostTemplate(id: number): Promise<boolean> {
  const result = await db
    .delete(mastodonPostTemplates)
    .where(eq(mastodonPostTemplates.id, id))
    .returning();
  return result.length > 0;
}
