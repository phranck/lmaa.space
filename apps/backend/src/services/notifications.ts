import type { SubmissionReviewStatus } from "@lmaa/shared";
import { sendSubmissionApproved, sendSubmissionRejected, sendWelcomeEmail } from "./email.js";

/**
 * Fire-and-forget welcome email sender for admin onboarding.
 *
 * @param to - Recipient email.
 * @param username - Login username.
 * @param password - Initial plaintext password for onboarding mail.
 *
 * @remarks
 * Errors are intentionally swallowed and logged because notification delivery
 * must not block account creation.
 */
export function sendWelcomeEmailInBackground(to: string, username: string, password: string): void {
  sendWelcomeEmail(to, username, password).catch((error) => {
    console.error("[email] Failed to send welcome email:", error);
  });
}

interface SubmissionFeedbackInput {
  to: string;
  shopName: string;
  status: SubmissionReviewStatus;
  reason?: string;
}

/**
 * Sends moderation feedback email for a reviewed submission.
 *
 * @param input - Submission feedback payload.
 * @returns `true` when email dispatch succeeded; otherwise `false`.
 */
export async function sendSubmissionFeedbackEmail(
  input: SubmissionFeedbackInput,
): Promise<boolean> {
  try {
    if (input.status === "approved") {
      await sendSubmissionApproved(input.to, input.shopName);
    } else {
      await sendSubmissionRejected(input.to, input.shopName, input.reason);
    }

    return true;
  } catch (error) {
    console.error("[email] Failed to send feedback:", error);
    return false;
  }
}
