import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM = env.EMAIL_FROM;

console.log("[email] init:", {
  configured: resend !== null,
  from: FROM,
  ownerEmail: env.OWNER_EMAIL ?? "(not set)",
  dashboardUrl: env.DASHBOARD_URL,
});

/**
 * Indicates whether outbound mail is configured.
 *
 * @returns `true` when Resend client is configured and usable.
 */
export function isEmailConfigured(): boolean {
  return resend !== null;
}

/**
 * Sends a plain email via Resend.
 *
 * @param to - Recipient address.
 * @param subject - Email subject.
 * @param html - Rendered HTML body.
 * @returns Resolves when provider accepted the message (or immediately if mail is disabled).
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  options?: { replyTo?: string },
): Promise<void> {
  if (!resend) {
    console.warn("[email] skipped – RESEND_API_KEY not set");
    return;
  }

  console.log("[email] sending:", { to, subject, from: FROM });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
    });
    if (error) {
      console.error("[email] resend error:", error);
    } else {
      console.log("[email] sent ok, id:", data?.id);
    }
  } catch (err) {
    console.error("[email] unexpected error:", err);
  }
}
