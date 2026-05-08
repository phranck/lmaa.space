import { AtpAgent, RichText } from "@atproto/api";

import { BLUESKY_PDS_URL } from "@lmaa/contracts";

import { type ApprovalPostContext, buildApprovalPostVariables } from "./mastodon.js";
import type { SocialMediaAccount, SocialMediaPostTemplate } from "../db/schema.js";
import { logger } from "../lib/logger.js";

const VAR_REGEX = /\{\{(\w+)\}\}/g;

function renderPlainTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(new RegExp(VAR_REGEX.source, "g"), (_, name) => variables[name] ?? "");
}

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
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
 * Posts a rendered template to a single BlueSky account. Logs in fresh per send
 * (no session caching). Errors are propagated to the caller.
 */
export async function postToBlueskyAccount(
  account: SocialMediaAccount,
  template: SocialMediaPostTemplate,
  context: ApprovalPostContext,
): Promise<void> {
  if (account.platform !== "bluesky") {
    throw new Error(`account ${account.id} is not a bluesky account`);
  }
  if (!account.handle) {
    throw new Error(`bluesky account ${account.id} missing handle`);
  }
  if (!template.bodyBluesky) {
    throw new Error(`template ${template.id} missing bodyBluesky`);
  }
  if (!consumeRateLimit(account.id)) {
    throw new Error(`BlueSky rate limit reached for account ${account.id}`);
  }

  const text = renderPlainTemplate(
    template.bodyBluesky,
    buildApprovalPostVariables(context),
  ).trim();
  if (!text) {
    logger.warn({ templateId: template.id }, "bluesky body rendered empty, skipping");
    return;
  }
  if (text.length > account.maxPostCharacters) {
    throw new Error(
      `bluesky body exceeds account ${account.id} maxPostCharacters (${text.length}/${account.maxPostCharacters})`,
    );
  }

  const agent = new AtpAgent({ service: BLUESKY_PDS_URL });
  await agent.login({ identifier: account.handle, password: account.accessToken });

  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  await agent.post({
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  });
}

export const __test__ = { renderPlainTemplate, consumeRateLimit, resetRateLimitBuckets };
