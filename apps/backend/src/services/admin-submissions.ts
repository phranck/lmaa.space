import type { SubmissionReviewStatus, SubmissionStatus } from "@lmaa/shared";
import {
  type SubmissionEditData,
  deleteSubmission,
  editSubmission,
  getSubmissionStatus,
  listAdminSubmissions,
  reviewSubmission,
  setShopOgImage,
  setSubmissionFeedbackSent,
} from "../repositories/admin-submissions.js";
import { sendSubmissionFeedbackEmail } from "./notifications.js";
import { hydrateShopOgImageInBackground } from "./preview-images.js";

export async function getAdminSubmissions(status?: SubmissionStatus) {
  return listAdminSubmissions(status);
}

export interface ReviewAdminSubmissionInput {
  id: number;
  status: SubmissionReviewStatus;
  adminNote?: string;
  sendFeedback?: boolean;
  adminId: number;
}

export async function reviewAdminSubmission(input: ReviewAdminSubmissionInput) {
  const { submission, newShop } = await reviewSubmission({
    id: input.id,
    status: input.status,
    adminNote: input.adminNote,
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

  if (input.sendFeedback && submission.submitterEmail) {
    const sent = await sendSubmissionFeedbackEmail({
      to: submission.submitterEmail,
      shopName: submission.shopName,
      status: input.status,
      reason: input.adminNote,
    });
    if (sent) {
      await setSubmissionFeedbackSent(input.id);
    }
  }

  return { ok: true as const, submission };
}

export async function editAdminSubmission(id: number, data: SubmissionEditData) {
  return editSubmission(id, data);
}

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
