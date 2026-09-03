import type { SocialMediaPostTemplateScope, TemplateAssignment } from "@lmaa/contracts";

import { recordBackgroundError } from "./background-errors.js";
import { postToBlueskyAccount } from "./bluesky.js";
import { postToMastodonAccount } from "./mastodon.js";
import type { PostContext } from "./post-context.js";
import { logger } from "../lib/logger.js";
import { upsertChoice } from "../repositories/admin-user-account-template-choice.js";
import { getAccountById } from "../repositories/social-media-accounts.js";
import { getSocialMediaPostTemplateById } from "../repositories/social-media-post-templates.js";

/**
 * Persists the sticky template choice per (admin, account, scope) and, when
 * a non-null `templateId` is supplied, fires a social-media post for the
 * given context. Each assignment is processed independently — failures are
 * recorded via `recordBackgroundError` and never abort the loop.
 *
 * @param adminUserId - Admin who triggered the dispatch, or `null` for the
 *   automated check. The identifier is used for the sticky per-moderator
 *   choice and for nothing else, so an automated dispatch simply remembers
 *   nothing.
 * @param scope - Origin of the dispatch (`submission` or `category`); must
 *   be present in the template's `scopes` array for the post to fire.
 * @param assignments - Per-account template selections from the UI.
 * @param context - Discriminated union describing the post subject, used by
 *   `postToMastodonAccount` / `postToBlueskyAccount` to render variables.
 */
export async function dispatchTemplateAssignments(
  adminUserId: number | null,
  scope: SocialMediaPostTemplateScope,
  assignments: TemplateAssignment[],
  context: PostContext,
): Promise<void> {
  await Promise.all(
    assignments.map((assignment) =>
      dispatchTemplateAssignment(adminUserId, scope, assignment, context),
    ),
  );
}

async function dispatchTemplateAssignment(
  adminUserId: number | null,
  scope: SocialMediaPostTemplateScope,
  assignment: TemplateAssignment,
  context: PostContext,
): Promise<void> {
  // The sticky choice is what a moderator's next dialogue opens with, so there
  // is nothing to remember for a check nobody opened.
  if (adminUserId !== null) {
    try {
      await upsertChoice(adminUserId, assignment.accountId, assignment.templateId, scope);
    } catch (err) {
      await recordBackgroundError("template-choice-upsert", err, {
        adminUserId,
        accountId: assignment.accountId,
        scope,
      });
    }
  }

  if (assignment.templateId === null) return;

  try {
    const account = await getAccountById(assignment.accountId);
    if (!account || !account.isActive) {
      logger.warn(
        { accountId: assignment.accountId, scope },
        "templateAssignments: account not found or inactive, skipping",
      );
      return;
    }
    const template = await getSocialMediaPostTemplateById(assignment.templateId);
    if (!template) {
      await recordBackgroundError(
        `${account.platform}-post`,
        new Error(`templateId ${assignment.templateId} not found`),
        { accountId: account.id, scope },
      );
      return;
    }
    if (!new Set(template.scopes).has(scope)) {
      await recordBackgroundError(
        `${account.platform}-post`,
        new Error(`template ${template.id} does not cover scope ${scope}`),
        { accountId: account.id, templateId: template.id, scope },
      );
      return;
    }
    if (!new Set(template.platforms).has(account.platform)) {
      await recordBackgroundError(
        `${account.platform}-post`,
        new Error(`template ${template.id} does not cover platform ${account.platform}`),
        { accountId: account.id, templateId: template.id, scope },
      );
      return;
    }
    if (account.platform === "mastodon") {
      await postToMastodonAccount(account, template, context);
    } else {
      await postToBlueskyAccount(account, template, context);
    }
  } catch (err) {
    await recordBackgroundError("social-media-post", err, {
      accountId: assignment.accountId,
      templateId: assignment.templateId,
      scope,
    });
  }
}
