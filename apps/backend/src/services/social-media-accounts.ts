import type { MastodonAccount, MastodonVisibility } from "@lmaa/contracts";

import type { SocialMediaAccount, SocialMediaAccountInsert } from "../db/schema.js";
import {
  deleteMastodonAccount,
  getMastodonAccountById,
  insertMastodonAccount,
  listMastodonAccounts,
  updateMastodonAccount,
} from "../repositories/social-media-accounts.js";

function normalizeInstanceUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function rowToMastodonAccount(row: SocialMediaAccount): MastodonAccount {
  return {
    id: row.id,
    label: row.label,
    instanceUrl: row.instanceUrl,
    username: row.username,
    visibility: row.visibility as MastodonVisibility,
    isActive: row.isActive,
    hasAccessToken: row.accessToken.trim().length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getManagedMastodonAccounts(): Promise<MastodonAccount[]> {
  const rows = await listMastodonAccounts();
  return rows.map(rowToMastodonAccount);
}

export async function createManagedMastodonAccount(
  data: Omit<SocialMediaAccountInsert, "platform">,
): Promise<MastodonAccount> {
  const row = await insertMastodonAccount({
    ...data,
    platform: "mastodon",
    instanceUrl: normalizeInstanceUrl(data.instanceUrl),
    username: data.username || null,
  });
  return rowToMastodonAccount(row);
}

export async function updateManagedMastodonAccount(
  id: number,
  data: Partial<Omit<SocialMediaAccountInsert, "platform">>,
): Promise<{ ok: true; data: MastodonAccount } | { ok: false; reason: "not_found" }> {
  const existing = await getMastodonAccountById(id);
  if (!existing) return { ok: false, reason: "not_found" };

  const row = await updateMastodonAccount(id, {
    ...data,
    ...(data.instanceUrl !== undefined
      ? { instanceUrl: normalizeInstanceUrl(data.instanceUrl) }
      : {}),
    ...(data.username !== undefined ? { username: data.username || null } : {}),
  });
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: rowToMastodonAccount(row) };
}

export async function deleteManagedMastodonAccount(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteMastodonAccount(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}
