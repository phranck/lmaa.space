import { eq, sql } from "drizzle-orm";

import type { SocialMediaPostTemplateScope } from "@lmaa/contracts";

import { db } from "../db/index.js";
import {
  type SocialMediaPostTemplate,
  type SocialMediaPostTemplateInsert,
  socialMediaPostTemplates,
} from "../db/schema.js";

export async function listSocialMediaPostTemplates(
  scope?: SocialMediaPostTemplateScope,
): Promise<SocialMediaPostTemplate[]> {
  const query = db.select().from(socialMediaPostTemplates);
  if (scope) {
    return query
      .where(sql`${scope} = ANY(${socialMediaPostTemplates.scopes})`)
      .orderBy(socialMediaPostTemplates.name);
  }
  return query.orderBy(socialMediaPostTemplates.name);
}

export async function getSocialMediaPostTemplateById(
  id: number,
): Promise<SocialMediaPostTemplate | null> {
  const [row] = await db
    .select()
    .from(socialMediaPostTemplates)
    .where(eq(socialMediaPostTemplates.id, id))
    .limit(1);
  return row ?? null;
}

export async function getSocialMediaPostTemplateByName(
  name: string,
): Promise<SocialMediaPostTemplate | null> {
  const [row] = await db
    .select()
    .from(socialMediaPostTemplates)
    .where(eq(socialMediaPostTemplates.name, name))
    .limit(1);
  return row ?? null;
}

export async function insertSocialMediaPostTemplate(
  data: SocialMediaPostTemplateInsert,
): Promise<SocialMediaPostTemplate> {
  const [created] = await db.insert(socialMediaPostTemplates).values(data).returning();
  return created;
}

export async function updateSocialMediaPostTemplate(
  id: number,
  data: Partial<SocialMediaPostTemplateInsert>,
): Promise<SocialMediaPostTemplate | null> {
  const [updated] = await db
    .update(socialMediaPostTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(socialMediaPostTemplates.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteSocialMediaPostTemplate(id: number): Promise<boolean> {
  const result = await db
    .delete(socialMediaPostTemplates)
    .where(eq(socialMediaPostTemplates.id, id))
    .returning();
  return result.length > 0;
}
