import { createHash } from "node:crypto";

import { encodeShopToken } from "@lmaa/shared";

import { recordBackgroundError } from "./background-errors.js";
import { env } from "../config/env.js";
import type { MastodonPostTemplate, SocialMediaAccount, Submission } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { getMastodonPostTemplateById } from "../repositories/mastodon-post-templates.js";
import { listActiveMastodonAccounts } from "../repositories/social-media-accounts.js";

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

interface ApprovalPostContext {
  submission: Submission;
  newShopId: number;
  adminNote: string;
  categoryNames: string[];
}

function renderPlainTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(new RegExp(VAR_REGEX.source, "g"), (_, name) => variables[name] ?? "");
}

function buildApprovalPostVariables(context: ApprovalPostContext): Record<string, string> {
  const { submission, newShopId, adminNote, categoryNames } = context;
  return {
    shopName: submission.shopName,
    shopUrl: submission.shopUrl,
    shopDescription: submission.description ?? "",
    shopRegion: Array.isArray(submission.region) ? submission.region.join(", ") : "",
    shopShipping: submission.shipping ?? "",
    shopPickup: submission.pickup ?? "",
    shopContactEmail: submission.contactEmail ?? "",
    shopCategories: categoryNames.join(", "),
    shopPageUrl: `${env.FRONTEND_URL}/shop/${encodeShopToken(newShopId)}`,
    adminNote,
    frontendUrl: env.FRONTEND_URL,
    dashboardUrl: env.DASHBOARD_URL,
  };
}

function idempotencyKey(
  account: SocialMediaAccount,
  template: MastodonPostTemplate,
  submission: Submission,
): string {
  return createHash("sha256")
    .update(`submission:${submission.id}:template:${template.id}:account:${account.id}`)
    .digest("hex");
}

async function postToMastodon(
  account: SocialMediaAccount,
  template: MastodonPostTemplate,
  submission: Submission,
  status: string,
): Promise<void> {
  if (!consumeRateLimit(account.id)) {
    throw new Error(`Mastodon rate limit reached for account ${account.id}`);
  }

  const endpoint = new URL("/api/v1/statuses", account.instanceUrl);
  const body = new URLSearchParams();
  body.set("status", status);
  body.set("visibility", account.visibility);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey(account, template, submission),
    },
    body,
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
export const __test__ = { renderPlainTemplate, idempotencyKey, consumeRateLimit, resetRateLimitBuckets };

/**
 * Sends an approval announcement to all active Mastodon accounts.
 */
export function sendMastodonApprovalPost(templateId: number, context: ApprovalPostContext): void {
  void (async () => {
    try {
      const template = await getMastodonPostTemplateById(templateId);
      if (!template) {
        logger.warn({ templateId }, "mastodon post template not found, skipping post");
        return;
      }

      const accounts = await listActiveMastodonAccounts();
      if (accounts.length === 0) {
        logger.warn({ templateId }, "no active mastodon accounts configured, skipping post");
        return;
      }

      const status = renderPlainTemplate(
        template.bodyText,
        buildApprovalPostVariables(context),
      ).trim();
      if (!status) {
        logger.warn({ templateId }, "mastodon post template rendered empty, skipping post");
        return;
      }

      const results = await Promise.allSettled(
        accounts.map((account) => postToMastodon(account, template, context.submission, status)),
      );

      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (result.status === "rejected") {
          await recordBackgroundError("mastodon-post", result.reason, {
            accountId: accounts[index]?.id,
            templateId,
            submissionId: context.submission.id,
          });
        }
      }
    } catch (err) {
      await recordBackgroundError("mastodon-post", err, { templateId });
    }
  })();
}
