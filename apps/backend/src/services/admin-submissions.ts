import type { SubmissionReviewStatus, SubmissionStatus } from "@lmaa/shared";
import { fetchPreviewImage } from "../lib/og.js";
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
import { sendSubmissionApproved, sendSubmissionRejected } from "./email.js";

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
    fetchPreviewImage(newShop.url)
      .then(async (result) => {
        if (result) {
          await setShopOgImage(newShop.id, result.url);
        }
      })
      .catch(() => {});
  }

  if (input.sendFeedback && submission.submitterEmail) {
    try {
      if (input.status === "approved") {
        await sendSubmissionApproved(submission.submitterEmail, submission.shopName);
      } else {
        await sendSubmissionRejected(
          submission.submitterEmail,
          submission.shopName,
          input.adminNote,
        );
      }
      await setSubmissionFeedbackSent(input.id);
    } catch (error) {
      console.error("[email] Failed to send feedback:", error);
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
