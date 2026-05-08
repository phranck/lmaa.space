import type { BlueskyAccount, MastodonAccount, MastodonVisibility } from "@lmaa/contracts";
import {
  BLUESKY_FIXED_MAX_POST_CHARACTERS,
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
} from "@lmaa/contracts";

import type { SocialMediaAccount, SocialMediaAccountInsert } from "../db/schema.js";
import {
  deleteBlueskyAccount,
  deleteMastodonAccount,
  getBlueskyAccount,
  getMastodonAccount,
  insertBlueskyAccount,
  insertMastodonAccount,
  updateBlueskyAccount,
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
    visibility: (row.visibility ?? "public") as MastodonVisibility,
    maxPostCharacters: row.maxPostCharacters,
    isActive: row.isActive,
    hasAccessToken: row.accessToken.trim().length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToBlueskyAccount(row: SocialMediaAccount): BlueskyAccount {
  if (!row.handle) {
    throw new Error(`bluesky row ${row.id} missing handle`);
  }
  return {
    id: row.id,
    label: row.label,
    handle: row.handle,
    isActive: row.isActive,
    hasAccessToken: row.accessToken.trim().length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Mastodon ────────────────────────────────────────────────────────────────

export async function getManagedMastodonAccount(): Promise<MastodonAccount | null> {
  const row = await getMastodonAccount();
  return row ? rowToMastodonAccount(row) : null;
}

export async function createManagedMastodonAccount(data: {
  label: string;
  instanceUrl: string;
  username?: string;
  accessToken: string;
  visibility?: MastodonVisibility;
  maxPostCharacters?: number;
  isActive?: boolean;
}): Promise<{ ok: true; data: MastodonAccount } | { ok: false; reason: "conflict" }> {
  const existing = await getMastodonAccount();
  if (existing) return { ok: false, reason: "conflict" };
  const insertable: Omit<SocialMediaAccountInsert, "platform"> = {
    label: data.label,
    instanceUrl: normalizeInstanceUrl(data.instanceUrl),
    username: data.username || null,
    accessToken: data.accessToken,
    visibility: data.visibility ?? "public",
    maxPostCharacters: data.maxPostCharacters ?? MASTODON_DEFAULT_MAX_POST_CHARACTERS,
    isActive: data.isActive ?? true,
  };
  const row = await insertMastodonAccount(insertable);
  return { ok: true, data: rowToMastodonAccount(row) };
}

export async function updateManagedMastodonAccount(
  id: number,
  data: Partial<{
    label: string;
    instanceUrl: string;
    username?: string;
    accessToken: string;
    visibility: MastodonVisibility;
    maxPostCharacters: number;
    isActive: boolean;
  }>,
): Promise<{ ok: true; data: MastodonAccount } | { ok: false; reason: "not_found" }> {
  const patch: Partial<Omit<SocialMediaAccountInsert, "platform">> = {
    ...(data.label !== undefined ? { label: data.label } : {}),
    ...(data.instanceUrl !== undefined
      ? { instanceUrl: normalizeInstanceUrl(data.instanceUrl) }
      : {}),
    ...(data.username !== undefined ? { username: data.username || null } : {}),
    ...(data.accessToken !== undefined ? { accessToken: data.accessToken } : {}),
    ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
    ...(data.maxPostCharacters !== undefined
      ? { maxPostCharacters: data.maxPostCharacters }
      : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
  const row = await updateMastodonAccount(id, patch);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: rowToMastodonAccount(row) };
}

export async function deleteManagedMastodonAccount(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteMastodonAccount(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}

// ─── BlueSky ─────────────────────────────────────────────────────────────────

export async function getManagedBlueskyAccount(): Promise<BlueskyAccount | null> {
  const row = await getBlueskyAccount();
  return row ? rowToBlueskyAccount(row) : null;
}

export async function createManagedBlueskyAccount(data: {
  label: string;
  handle: string;
  appPassword: string;
  isActive?: boolean;
}): Promise<{ ok: true; data: BlueskyAccount } | { ok: false; reason: "conflict" }> {
  const existing = await getBlueskyAccount();
  if (existing) return { ok: false, reason: "conflict" };
  const insertable: Omit<SocialMediaAccountInsert, "platform"> = {
    label: data.label,
    instanceUrl: "",
    handle: data.handle,
    username: null,
    accessToken: data.appPassword,
    visibility: null,
    maxPostCharacters: BLUESKY_FIXED_MAX_POST_CHARACTERS,
    isActive: data.isActive ?? true,
  };
  const row = await insertBlueskyAccount(insertable);
  return { ok: true, data: rowToBlueskyAccount(row) };
}

export async function updateManagedBlueskyAccount(
  id: number,
  data: Partial<{
    label: string;
    handle: string;
    appPassword: string;
    isActive: boolean;
  }>,
): Promise<{ ok: true; data: BlueskyAccount } | { ok: false; reason: "not_found" }> {
  const patch: Partial<Omit<SocialMediaAccountInsert, "platform">> = {
    ...(data.label !== undefined ? { label: data.label } : {}),
    ...(data.handle !== undefined ? { handle: data.handle } : {}),
    ...(data.appPassword !== undefined ? { accessToken: data.appPassword } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };
  const row = await updateBlueskyAccount(id, patch);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: rowToBlueskyAccount(row) };
}

export async function deleteManagedBlueskyAccount(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteBlueskyAccount(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}
