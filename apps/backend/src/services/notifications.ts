import type { SubmissionReviewStatus } from "@lmaa/shared";
import { sendSubmissionApproved, sendSubmissionRejected, sendWelcomeEmail } from "./email.js";

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
