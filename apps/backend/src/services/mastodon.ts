import { createHash } from "node:crypto";

import { type PostContext, buildPostVariables, idempotencyEntityKey } from "./post-context.js";
import type { SocialMediaAccount, SocialMediaPostTemplate } from "../db/schema.js";
import { logger } from "../lib/logger.js";

const VAR_REGEX = /\{\{(\w+)\}\}/g;

// ---------------------------------------------------------------------------
// Outbound rate-limit (per account, in-process)
// Mirrors Mastodon's documented default: 300 requests per 5-minute window.
// Buckets are NOT pruned; relies on resetAt-on-access cleanup (lazy reset).
// If multi-instance ever lands, migrate to the DatabaseRateLimitStore pattern
// in apps/backend/src/middleware/rate-limit.ts:61-103.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 300;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const accountBuckets = new Map<number, { count: number; resetAt: number }>();

function consumeRateLimit(accountId: number): boolean {
  const now = Date.now();
  const bucket = accountBuckets.get(accountId);
  if (!bucket || bucket.resetAt < now) {
    accountBuckets.set(accountId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

function resetRateLimitBuckets(): void {
  accountBuckets.clear();
}

/**
 * @deprecated Use PostContext directly. Kept as alias during migration.
 */
export type ApprovalPostContext = Extract<PostContext, { kind: "submission" }>;

function renderPlainTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(new RegExp(VAR_REGEX.source, "g"), (_, name) => variables[name] ?? "");
}

/**
 * @deprecated Use buildPostVariables directly.
 */
export const buildApprovalPostVariables = buildPostVariables;

function idempotencyKey(
  account: SocialMediaAccount,
  template: SocialMediaPostTemplate,
  context: PostContext,
): string {
  return createHash("sha256")
    .update(`${idempotencyEntityKey(context)}:template:${template.id}:account:${account.id}`)
    .digest("hex");
}

/**
 * Posts a rendered template to a single Mastodon account. Returns void on success;
 * thrown errors are caught by the caller (admin-submissions) and routed to
 * `recordBackgroundError`.
 */
export async function postToMastodonAccount(
  account: SocialMediaAccount,
  template: SocialMediaPostTemplate,
  context: PostContext,
): Promise<void> {
  if (account.platform !== "mastodon") {
    throw new Error(`account ${account.id} is not a mastodon account`);
  }
  if (!account.canPost || !account.accessToken || account.maxPostCharacters === null) {
    throw new Error(`account ${account.id} is not configured for posting`);
  }
  if (!template.bodyMastodon) {
    throw new Error(`template ${template.id} missing bodyMastodon`);
  }
  if (!consumeRateLimit(account.id)) {
    throw new Error(`Mastodon rate limit reached for account ${account.id}`);
  }

  const status = renderPlainTemplate(template.bodyMastodon, buildPostVariables(context)).trim();
  if (!status) {
    logger.warn({ templateId: template.id }, "mastodon body rendered empty, skipping");
    return;
  }
  if (status.length > account.maxPostCharacters) {
    throw new Error(
      `mastodon body exceeds account ${account.id} maxPostCharacters (${status.length}/${account.maxPostCharacters})`,
    );
  }

  const endpoint = new URL("/api/v1/statuses", account.instanceUrl);
  const body = new URLSearchParams();
  body.set("status", status);
  if (account.visibility) body.set("visibility", account.visibility);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey(account, template, context),
    },
    body,
    // Block redirect-based SSRF: a 3xx to an internal target must not be followed.
    redirect: "error",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Mastodon post failed with ${response.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Exported solely for unit-testing private helpers.
 * Do NOT use outside of test files.
 */
export const __test__ = {
  renderPlainTemplate,
  idempotencyKey,
  consumeRateLimit,
  resetRateLimitBuckets,
};
