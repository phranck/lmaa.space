import type { SubmissionReviewStatus, SubmissionStatus } from "@lmaa/shared";
import {
  type SubmissionEditData,
  deleteSubmission,
  editSubmission,
  getSubmissionStatus,
  listAdminSubmissions,
  reviewSubmission,
  setShopOgImage,
} from "../repositories/admin-submissions.js";
import { hydrateShopOgImageInBackground } from "./preview-images.js";

/**
 * Lists submissions for moderation with optional status filter.
 *
 * @param status - Optional moderation status filter.
 * @returns Submission list for admin tables.
 */
export async function getAdminSubmissions(status?: SubmissionStatus) {
  return listAdminSubmissions(status);
}

/**
 * Input contract for submission moderation action.
 */
export interface ReviewAdminSubmissionInput {
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
 * - May send feedback email and persist `feedbackSent` flag.
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
    return { ok: false as const, reason: "not_found" as const };
  }

  if (newShop) {
    hydrateShopOgImageInBackground(newShop.url, async (imageUrl) => {
      await setShopOgImage(newShop.id, imageUrl);
    });
  }

  return { ok: true as const, submission };
}

/**
 * Edits persisted submission fields.
 *
 * @param id - Submission id.
 * @param data - Validated editable fields.
 * @returns Updated submission payload or `null`.
 */
export async function editAdminSubmission(id: number, data: SubmissionEditData) {
  return editSubmission(id, data);
}

/**
 * Deletes a submission only when status is `rejected`.
 *
 * @param id - Submission id.
 * @returns Result object describing not-found/invalid-status/success.
 */
export async function deleteRejectedAdminSubmission(id: number) {
  const status = await getSubmissionStatus(id);

  if (!status) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (status !== "rejected") {
    return { ok: false as const, reason: "invalid_status" as const };
  }

  await deleteSubmission(id);
  return { ok: true as const };
}
