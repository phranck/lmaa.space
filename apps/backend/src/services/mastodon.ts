import { createHash } from "node:crypto";

import { encodeShopToken } from "@lmaa/shared";

import { env } from "../config/env.js";
import type { MastodonPostTemplate, SocialMediaAccount, Submission } from "../db/schema.js";
import { logger } from "../lib/logger.js";
import { getMastodonPostTemplateById } from "../repositories/mastodon-post-templates.js";
import { listActiveMastodonAccounts } from "../repositories/social-media-accounts.js";

const VAR_REGEX = /\{\{(\w+)\}\}/g;

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

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          logger.error(
            { err: result.reason, accountId: accounts[index]?.id, templateId },
            "failed to send mastodon approval post",
          );
        }
      });
    } catch (err) {
      logger.error({ err, templateId }, "failed to prepare mastodon approval post");
    }
  })();
}
