import {
  BLUESKY_FIXED_MAX_POST_CHARACTERS,
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  type MastodonVisibility,
  type SocialMediaAccount,
  type SocialMediaAccountCreateInput,
  type SocialMediaAccountUpdateInput,
  type SocialMediaPlatformKey,
} from "@lmaa/contracts";

import { verifyBlueskyCredentials } from "./bluesky-account-validator.js";
import { verifyMastodonCredentials } from "./mastodon-account-validator.js";
import type {
  SocialMediaAccount as SocialMediaAccountRow,
  SocialMediaAccountInsert,
} from "../db/schema.js";
import {
  deleteAccount,
  getAccountById,
  insertAccount,
  type ListAccountsFilter,
  listAccounts,
  listFooterAccounts,
  updateAccount,
} from "../repositories/social-media-accounts.js";

const POSTING_PLATFORMS = new Set<SocialMediaPlatformKey>(["mastodon", "bluesky"]);

function normalizeInstanceUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function rowToSocialMediaAccount(row: SocialMediaAccountRow): SocialMediaAccount {
  return {
    id: row.id,
    platform: row.platform as SocialMediaPlatformKey,
    label: row.label,
    profileUrl: row.profileUrl,
    canPost: row.canPost,
    showInFooter: row.showInFooter,
    isActive: row.isActive,
    instanceUrl: row.instanceUrl ? row.instanceUrl : null,
    username: row.username,
    handle: row.handle,
    hasAccessToken: typeof row.accessToken === "string" && row.accessToken.trim().length > 0,
    visibility: (row.visibility as MastodonVisibility | null) ?? null,
    maxPostCharacters: row.maxPostCharacters,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type CreateResult =
  | { ok: true; data: SocialMediaAccount }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "credential_invalid"; message: string }
  | { ok: false; reason: "credential_unreachable"; message: string };

export type UpdateResult =
  | { ok: true; data: SocialMediaAccount }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "credential_invalid"; message: string }
  | { ok: false; reason: "credential_unreachable"; message: string };

export async function listSocialMediaAccounts(
  filter: ListAccountsFilter = {},
): Promise<SocialMediaAccount[]> {
  const rows = await listAccounts(filter);
  return rows.map(rowToSocialMediaAccount);
}

export async function listFooterSocialMediaAccounts(): Promise<
  Array<{ platform: SocialMediaPlatformKey; profileUrl: string; label: string }>
> {
  const rows = await listFooterAccounts();
  return rows.map((r) => ({
    platform: r.platform as SocialMediaPlatformKey,
    profileUrl: r.profileUrl,
    label: r.label,
  }));
}

export async function getSocialMediaAccount(id: number): Promise<SocialMediaAccount | null> {
  const row = await getAccountById(id);
  return row ? rowToSocialMediaAccount(row) : null;
}

async function buildInsertable(
  input: SocialMediaAccountCreateInput,
): Promise<{ ok: true; data: SocialMediaAccountInsert } | { ok: false; result: CreateResult }> {
  const platform = input.platform;
  const base: SocialMediaAccountInsert = {
    platform,
    label: input.label,
    profileUrl: input.profileUrl,
    canPost: input.canPost,
    showInFooter: input.showInFooter,
    isActive: input.isActive,
    instanceUrl: "",
    handle: null,
    username: null,
    accessToken: null,
    visibility: null,
    maxPostCharacters: null,
  };

  if (!input.canPost) return { ok: true, data: base };

  if (platform === "mastodon") {
    if (!input.instanceUrl || !input.accessToken) {
      return {
        ok: false,
        result: {
          ok: false,
          reason: "credential_invalid",
          message: "instanceUrl and accessToken are required for Mastodon posting accounts.",
        },
      };
    }
    const instanceUrl = normalizeInstanceUrl(input.instanceUrl);
    const verify = await verifyMastodonCredentials(instanceUrl, input.accessToken);
    if (!verify.ok) {
      return {
        ok: false,
        result: {
          ok: false,
          reason: verify.reason === "invalid_token" ? "credential_invalid" : "credential_unreachable",
          message: verify.message,
        },
      };
    }
    return {
      ok: true,
      data: {
        ...base,
        instanceUrl,
        username: input.username ?? verify.username,
        accessToken: input.accessToken,
        visibility: input.visibility ?? "public",
        maxPostCharacters: input.maxPostCharacters ?? MASTODON_DEFAULT_MAX_POST_CHARACTERS,
      },
    };
  }

  if (platform === "bluesky") {
    if (!input.handle || !input.appPassword) {
      return {
        ok: false,
        result: {
          ok: false,
          reason: "credential_invalid",
          message: "handle and appPassword are required for Bluesky posting accounts.",
        },
      };
    }
    const verify = await verifyBlueskyCredentials(input.handle, input.appPassword);
    if (!verify.ok) {
      return {
        ok: false,
        result: {
          ok: false,
          reason:
            verify.reason === "invalid_credentials" ? "credential_invalid" : "credential_unreachable",
          message: verify.message,
        },
      };
    }
    return {
      ok: true,
      data: {
        ...base,
        handle: input.handle,
        accessToken: input.appPassword,
        maxPostCharacters: BLUESKY_FIXED_MAX_POST_CHARACTERS,
      },
    };
  }

  return {
    ok: false,
    result: {
      ok: false,
      reason: "credential_invalid",
      message: "Posting is only available for Mastodon and Bluesky accounts.",
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; constraint_name?: string };
  return e.code === "23505" && e.constraint_name === "social_media_accounts_post_unique";
}

export async function createSocialMediaAccount(
  input: SocialMediaAccountCreateInput,
): Promise<CreateResult> {
  const built = await buildInsertable(input);
  if (!built.ok) return built.result;

  try {
    const row = await insertAccount(built.data);
    return { ok: true, data: rowToSocialMediaAccount(row) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: "conflict" };
    throw err;
  }
}

export async function updateSocialMediaAccount(
  id: number,
  input: SocialMediaAccountUpdateInput,
): Promise<UpdateResult> {
  const existing = await getAccountById(id);
  if (!existing) return { ok: false, reason: "not_found" };

  const merged: SocialMediaAccountCreateInput = {
    platform: (input.platform ?? existing.platform) as SocialMediaPlatformKey,
    label: input.label ?? existing.label,
    profileUrl: input.profileUrl ?? existing.profileUrl,
    canPost: input.canPost ?? existing.canPost,
    showInFooter: input.showInFooter ?? existing.showInFooter,
    isActive: input.isActive ?? existing.isActive,
    instanceUrl: input.instanceUrl ?? existing.instanceUrl ?? undefined,
    username: input.username ?? existing.username ?? undefined,
    handle: input.handle ?? existing.handle ?? undefined,
    accessToken: input.accessToken,
    appPassword: input.appPassword,
    visibility: (input.visibility ?? existing.visibility) as MastodonVisibility | undefined,
    maxPostCharacters: input.maxPostCharacters ?? existing.maxPostCharacters ?? undefined,
  };

  const credentialsChanging =
    merged.canPost &&
    POSTING_PLATFORMS.has(merged.platform) &&
    (input.accessToken !== undefined || input.appPassword !== undefined ||
      input.instanceUrl !== undefined || input.handle !== undefined);

  let nextValues: Partial<SocialMediaAccountInsert>;

  if (credentialsChanging || (merged.canPost && !existing.canPost)) {
    if (!input.accessToken && existing.accessToken && merged.platform === "mastodon") {
      merged.accessToken = existing.accessToken;
    }
    if (!input.appPassword && existing.accessToken && merged.platform === "bluesky") {
      merged.appPassword = existing.accessToken;
    }
    const built = await buildInsertable(merged);
    if (!built.ok) return built.result;
    nextValues = built.data;
  } else {
    nextValues = {
      label: merged.label,
      profileUrl: merged.profileUrl,
      canPost: merged.canPost,
      showInFooter: merged.showInFooter,
      isActive: merged.isActive,
    };
    if (!merged.canPost) {
      nextValues.accessToken = null;
      nextValues.maxPostCharacters = null;
      nextValues.visibility = null;
    }
  }

  try {
    const row = await updateAccount(id, nextValues);
    if (!row) return { ok: false, reason: "not_found" };
    return { ok: true, data: rowToSocialMediaAccount(row) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: "conflict" };
    throw err;
  }
}

export async function deleteSocialMediaAccount(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteAccount(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}
