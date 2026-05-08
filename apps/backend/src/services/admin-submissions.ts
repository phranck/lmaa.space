import type { SubmissionReviewStatus } from "@lmaa/shared";

import { renderEmailTemplate } from "./email-renderer.js";
import { sendMail } from "./email.js";
import { sendMastodonApprovalPost } from "./mastodon.js";
import { hydrateShopOgImageInBackground } from "./preview-images.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { failure, success } from "../lib/result.js";
import { setAdminShopOgImage } from "../repositories/admin-shops.js";
import {
  deleteSubmission,
  getSubmissionCategoryNames,
  getSubmissionStatus,
  reviewSubmission,
} from "../repositories/admin-submissions.js";
import { getEmailTemplateById } from "../repositories/email-templates.js";

/**
 * Input contract for submission moderation action.
 */
interface ReviewAdminSubmissionInput {
  id: number;
  status: SubmissionReviewStatus;
  adminNote?: string;
  rejectionLongText?: string;
  rejectionToken?: string;
  adminId: number;
  notificationTemplateId?: number;
  templateId?: number;
}

/**
 * Reviews a submission and executes moderation side effects.
 *
 * @param input - Moderation payload.
 * @returns
 * - `{ ok: false, reason: "not_found" }` when submission does not exist or was already finalized.
 * - `{ ok: false, reason: "shop_exists", existingShopName }` when approving and
 *   another public shop already claims the same registered domain (e.g. after
 *   a separate duplicate submission was approved first).
 * - `{ ok: true, submission }` when review is persisted.
 *
 * @remarks
 * Side effects:
 * - May create a new shop when status is `approved`.
 * - May hydrate and persist OG image for newly created shop.
 */
export async function reviewAdminSubmission(input: ReviewAdminSubmissionInput) {
  const { submission, newShop, conflict } = await reviewSubmission({
    id: input.id,
    status: input.status,
    adminNote: input.adminNote,
    rejectionLongText: input.rejectionLongText,
    rejectionToken: input.rejectionToken,
    adminId: input.adminId,
  });

  if (conflict) {
    return {
      ok: false as const,
      reason: "shop_exists" as const,
      existingShopName: conflict.existingShopName,
    };
  }

  if (!submission) {
    return failure("not_found");
  }

  if (newShop && !submission.ogImage) {
    hydrateShopOgImageInBackground(newShop.url, async (imageUrl) => {
      await setAdminShopOgImage(newShop.id, imageUrl);
    });
  }

  if (input.notificationTemplateId && submission.submitterEmail) {
    sendReviewNotification(submission.submitterEmail, input.notificationTemplateId, {
      shopName: submission.shopName,
      shopUrl: submission.shopUrl,
      adminNote: input.adminNote ?? "",
      rejectionToken: submission.rejectionToken ?? "",
      rejectionUrl: submission.rejectionToken
        ? `${env.FRONTEND_URL}/rejected/${submission.rejectionToken}`
        : "",
    });
  }

  if (input.status === "approved" && input.templateId && newShop) {
    const categoryNames = await getSubmissionCategoryNames(input.id);
    sendMastodonApprovalPost(input.templateId, {
      submission,
      newShopId: newShop.id,
      adminNote: input.adminNote ?? "",
      categoryNames,
    });
  }

  return success({ submission });
}

/**
 * Permanently deletes a submission, regardless of its current status.
 *
 * @param id - Submission id.
 * @returns Result object describing not-found/success.
 */
export async function deleteAdminSubmission(id: number) {
  const status = await getSubmissionStatus(id);

  if (!status) {
    return failure("not_found");
  }

  await deleteSubmission(id);
  return success();
}

/**
 * Sends a review notification email in the background (fire-and-forget).
 *
 * Template variables: `{{shopName}}`, `{{shopUrl}}`, `{{adminNote}}`, `{{rejectionToken}}`, `{{rejectionUrl}}`.
 */
function sendReviewNotification(
  to: string,
  templateId: number,
  variables: Record<string, string>,
): void {
  void (async () => {
    try {
      const template = await getEmailTemplateById(templateId);
      if (!template) {
        logger.warn({ templateId }, "review notification template not found, skipping email");
        return;
      }
      const { html, subject } = await renderEmailTemplate(template, variables);
      await sendMail(to, subject, html);
    } catch (err) {
      logger.error({ err, to, templateId }, "failed to send review notification");
    }
  })();
}
