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
 * Sends a plain email via Resend.
 *
 * @param to - Recipient address.
 * @param subject - Email subject.
 * @param html - Rendered HTML body.
 * @returns `true` if the provider accepted the message, `false` on error or when mail is disabled.
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  options?: { replyTo?: string },
): Promise<boolean> {
  if (!resend) {
    console.warn("[email] skipped – RESEND_API_KEY not set");
    return false;
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
      return false;
    }
    console.log("[email] sent ok, id:", data?.id);
    return true;
  } catch (err) {
    console.error("[email] unexpected error:", err);
    return false;
  }
}
