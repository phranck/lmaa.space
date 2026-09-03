import type { TemplateAssignment } from "@lmaa/contracts";
import type { SubmissionReviewStatus } from "@lmaa/shared";

import { recordBackgroundError } from "./background-errors.js";
import { dispatchTemplateAssignments } from "./dispatch-template-assignments.js";
import { renderEmailTemplate } from "./email-renderer.js";
import { sendMail } from "./email.js";
import type { PostContext } from "./post-context.js";
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
  /** Moderator who decided, or `null` when the automated reviewer applied the result. */
  adminId: number | null;
  notificationTemplateId?: number;
  templateAssignments?: TemplateAssignment[];
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

  // An automated approval posts too, with the templates configured in the
  // review settings. What decides it is the assignments rather than who
  // approved, so an approval without any stays quiet either way.
  if (input.status === "approved" && newShop && input.templateAssignments?.length) {
    const adminId = input.adminId;
    const categoryNames = await getSubmissionCategoryNames(input.id);
    const context: PostContext = {
      kind: "submission",
      submission,
      newShopId: newShop.id,
      adminNote: input.adminNote ?? "",
      categoryNames,
    };
    void dispatchTemplateAssignments(adminId, "submission", input.templateAssignments, context);
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
      await sendMail(to, subject, html, { errorSource: "review-notification" });
    } catch (err) {
      void recordBackgroundError("review-notification", err, { to, templateId });
    }
  })();
}
