import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  type SocialMediaAccount,
  type SocialMediaAccountInsert,
  socialMediaAccounts,
} from "../db/schema.js";

export interface ListAccountsFilter {
  platform?: string;
  canPost?: boolean;
  showInFooter?: boolean;
}

export async function listAccounts(filter: ListAccountsFilter = {}): Promise<SocialMediaAccount[]> {
  const conditions = [];
  if (filter.platform !== undefined) {
    conditions.push(eq(socialMediaAccounts.platform, filter.platform));
  }
  if (filter.canPost !== undefined) {
    conditions.push(eq(socialMediaAccounts.canPost, filter.canPost));
  }
  if (filter.showInFooter !== undefined) {
    conditions.push(eq(socialMediaAccounts.showInFooter, filter.showInFooter));
  }
  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);
  return db
    .select()
    .from(socialMediaAccounts)
    .where(where)
    .orderBy(asc(socialMediaAccounts.platform), asc(socialMediaAccounts.id));
}

export async function getAccountById(id: number): Promise<SocialMediaAccount | null> {
  const [row] = await db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.id, id))
    .limit(1);
  return row ?? null;
}

export async function insertAccount(input: SocialMediaAccountInsert): Promise<SocialMediaAccount> {
  const [created] = await db.insert(socialMediaAccounts).values(input).returning();
  return created;
}

export async function updateAccount(
  id: number,
  patch: Partial<SocialMediaAccountInsert>,
): Promise<SocialMediaAccount | null> {
  const [updated] = await db
    .update(socialMediaAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(socialMediaAccounts.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteAccount(id: number): Promise<boolean> {
  const result = await db
    .delete(socialMediaAccounts)
    .where(eq(socialMediaAccounts.id, id))
    .returning();
  return result.length > 0;
}

export interface FooterAccountRow {
  platform: string;
  profileUrl: string;
  label: string;
}

export async function listFooterAccounts(): Promise<FooterAccountRow[]> {
  const rows = await db
    .select({
      platform: socialMediaAccounts.platform,
      profileUrl: socialMediaAccounts.profileUrl,
      label: socialMediaAccounts.label,
    })
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.showInFooter, true))
    .orderBy(asc(socialMediaAccounts.platform), asc(socialMediaAccounts.id));
  return rows.filter((r) => r.profileUrl.length > 0);
}
