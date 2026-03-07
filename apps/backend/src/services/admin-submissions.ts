import type { SubmissionReviewStatus } from "@lmaa/shared";

import { hydrateShopOgImageInBackground } from "./preview-images.js";
import { failure, success } from "../lib/result.js";
import { setAdminShopOgImage } from "../repositories/admin-shops.js";
import {
  deleteSubmission,
  getSubmissionStatus,
  reviewSubmission,
} from "../repositories/admin-submissions.js";

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
}

/**
 * Reviews a submission and executes moderation side effects.
 *
 * @param input - Moderation payload.
 * @returns
 * - `{ ok: false, reason: "not_found" }` when submission does not exist.
 * - `{ ok: true, submission }` when review is persisted.
 *
 * @remarks
 * Side effects:
 * - May create a new shop when status is `approved`.
 * - May hydrate and persist OG image for newly created shop.
 */
export async function reviewAdminSubmission(input: ReviewAdminSubmissionInput) {
  const { submission, newShop } = await reviewSubmission({
    id: input.id,
    status: input.status,
    adminNote: input.adminNote,
    rejectionLongText: input.rejectionLongText,
    rejectionToken: input.rejectionToken,
    adminId: input.adminId,
  });

  if (!submission) {
    return failure("not_found");
  }

  if (newShop && !submission.ogImage) {
    hydrateShopOgImageInBackground(newShop.url, async (imageUrl) => {
      await setAdminShopOgImage(newShop.id, imageUrl);
    });
  }

  return success({ submission });
}

/**
 * Deletes a submission only when status is `rejected` or `onhold`.
 *
 * @param id - Submission id.
 * @returns Result object describing not-found/invalid-status/success.
 */
export async function deleteModeratedAdminSubmission(id: number) {
  const status = await getSubmissionStatus(id);

  if (!status) {
    return failure("not_found");
  }

  if (status !== "rejected" && status !== "onhold") {
    return failure("invalid_status");
  }

  await deleteSubmission(id);
  return success();
}
