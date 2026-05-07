import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type SocialMediaAccount,
  type SocialMediaAccountInsert,
  socialMediaAccounts,
} from "../db/schema.js";

export async function listMastodonAccounts(): Promise<SocialMediaAccount[]> {
  return db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.platform, "mastodon"))
    .orderBy(socialMediaAccounts.label);
}

export async function listActiveMastodonAccounts(): Promise<SocialMediaAccount[]> {
  return db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.platform, "mastodon"))
    .orderBy(socialMediaAccounts.label)
    .then((rows) => rows.filter((row) => row.isActive));
}

export async function getMastodonAccountById(id: number): Promise<SocialMediaAccount | null> {
  const [row] = await db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.id, id))
    .limit(1);
  if (row?.platform !== "mastodon") return null;
  return row ?? null;
}

export async function insertMastodonAccount(
  data: SocialMediaAccountInsert,
): Promise<SocialMediaAccount> {
  const [created] = await db
    .insert(socialMediaAccounts)
    .values({ ...data, platform: "mastodon" })
    .returning();
  return created;
}

export async function updateMastodonAccount(
  id: number,
  data: Partial<SocialMediaAccountInsert>,
): Promise<SocialMediaAccount | null> {
  const [updated] = await db
    .update(socialMediaAccounts)
    .set({ ...data, platform: "mastodon", updatedAt: new Date() })
    .where(eq(socialMediaAccounts.id, id))
    .returning();
  if (updated?.platform !== "mastodon") return null;
  return updated ?? null;
}

export async function deleteMastodonAccount(id: number): Promise<boolean> {
  const result = await db
    .delete(socialMediaAccounts)
    .where(eq(socialMediaAccounts.id, id))
    .returning();
  return result.length > 0;
}
