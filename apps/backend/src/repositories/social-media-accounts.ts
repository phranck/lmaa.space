import { and, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type SocialMediaAccount,
  type SocialMediaAccountInsert,
  socialMediaAccounts,
} from "../db/schema.js";

// ─── Mastodon ────────────────────────────────────────────────────────────────

export async function getMastodonAccount(): Promise<SocialMediaAccount | null> {
  const [row] = await db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.platform, "mastodon"))
    .limit(1);
  return row ?? null;
}

export async function getActiveMastodonAccount(): Promise<SocialMediaAccount | null> {
  const row = await getMastodonAccount();
  return row?.isActive ? row : null;
}

export async function insertMastodonAccount(
  data: Omit<SocialMediaAccountInsert, "platform">,
): Promise<SocialMediaAccount> {
  const [created] = await db
    .insert(socialMediaAccounts)
    .values({ ...data, platform: "mastodon" })
    .returning();
  return created;
}

export async function updateMastodonAccount(
  id: number,
  data: Partial<Omit<SocialMediaAccountInsert, "platform">>,
): Promise<SocialMediaAccount | null> {
  const [updated] = await db
    .update(socialMediaAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(socialMediaAccounts.id, id), eq(socialMediaAccounts.platform, "mastodon")))
    .returning();
  return updated ?? null;
}

export async function deleteMastodonAccount(id: number): Promise<boolean> {
  const result = await db
    .delete(socialMediaAccounts)
    .where(and(eq(socialMediaAccounts.id, id), eq(socialMediaAccounts.platform, "mastodon")))
    .returning();
  return result.length > 0;
}

// ─── BlueSky ─────────────────────────────────────────────────────────────────

export async function getBlueskyAccount(): Promise<SocialMediaAccount | null> {
  const [row] = await db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.platform, "bluesky"))
    .limit(1);
  return row ?? null;
}

export async function getActiveBlueskyAccount(): Promise<SocialMediaAccount | null> {
  const row = await getBlueskyAccount();
  return row?.isActive ? row : null;
}

export async function insertBlueskyAccount(
  data: Omit<SocialMediaAccountInsert, "platform">,
): Promise<SocialMediaAccount> {
  const [created] = await db
    .insert(socialMediaAccounts)
    .values({ ...data, platform: "bluesky" })
    .returning();
  return created;
}

export async function updateBlueskyAccount(
  id: number,
  data: Partial<Omit<SocialMediaAccountInsert, "platform">>,
): Promise<SocialMediaAccount | null> {
  const [updated] = await db
    .update(socialMediaAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(socialMediaAccounts.id, id), eq(socialMediaAccounts.platform, "bluesky")))
    .returning();
  return updated ?? null;
}

export async function deleteBlueskyAccount(id: number): Promise<boolean> {
  const result = await db
    .delete(socialMediaAccounts)
    .where(and(eq(socialMediaAccounts.id, id), eq(socialMediaAccounts.platform, "bluesky")))
    .returning();
  return result.length > 0;
}

// ─── Generic ─────────────────────────────────────────────────────────────────

export async function getAccountById(id: number): Promise<SocialMediaAccount | null> {
  const [row] = await db
    .select()
    .from(socialMediaAccounts)
    .where(eq(socialMediaAccounts.id, id))
    .limit(1);
  return row ?? null;
}
