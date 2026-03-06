import { Resend } from "resend";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM = env.EMAIL_FROM;

logger.info(
  { configured: resend !== null, from: FROM, ownerEmail: env.OWNER_EMAIL ?? "(not set)" },
  "email service initialized",
);

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
    logger.warn("email skipped: RESEND_API_KEY not set");
    return false;
  }

  logger.info({ to, subject, from: FROM }, "sending email");

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
    });
    if (error) {
      logger.error({ err: error }, "resend API error");
      return false;
    }
    logger.info({ emailId: data?.id }, "email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "email send failed");
    return false;
  }
}
