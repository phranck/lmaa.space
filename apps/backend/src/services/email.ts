import { Resend } from "resend";

import { recordBackgroundError } from "./background-errors.js";
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
 * @param options.errorSource - Tag used when persisting the failure to background errors. Defaults to `"email"`.
 * @returns `true` if the provider accepted the message, `false` on error or when mail is disabled.
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  options?: { replyTo?: string; errorSource?: string },
): Promise<boolean> {
  if (!resend) {
    logger.warn("email skipped: RESEND_API_KEY not set");
    return false;
  }

  const errorSource = options?.errorSource ?? "email";
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
      void recordBackgroundError(errorSource, error, { to, subject });
      return false;
    }
    logger.info({ emailId: data?.id }, "email sent");
    return true;
  } catch (err) {
    void recordBackgroundError(errorSource, err, { to, subject });
    return false;
  }
}
