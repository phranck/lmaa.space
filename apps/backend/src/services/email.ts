import { render } from "@react-email/components";
import { Resend } from "resend";
import { env } from "../config/env.js";
import { ApprovedEmail } from "../emails/ApprovedEmail.js";
import { DeadLinkReportEmail } from "../emails/DeadLinkReportEmail.js";
import { NewSubmissionEmail } from "../emails/NewSubmissionEmail.js";
import { RejectedEmail } from "../emails/RejectedEmail.js";
import { WelcomeEmail } from "../emails/WelcomeEmail.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM = env.EMAIL_FROM;
const DASHBOARD_URL = env.DASHBOARD_URL;
const OWNER_EMAIL = env.OWNER_EMAIL ?? null;

/**
 * Indicates whether outbound mail is configured.
 *
 * @returns `true` when Resend client is configured and usable.
 */
export function isEmailConfigured(): boolean {
  return resend !== null;
}

/**
 * Sends a welcome email with initial dashboard credentials.
 *
 * @param to - Recipient email address.
 * @param username - Login username.
 * @param password - Initial plaintext password.
 * @returns Resolves when provider accepted the message (or immediately if mail is disabled).
 */
export async function sendWelcomeEmail(
  to: string,
  username: string,
  password: string,
): Promise<void> {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Deine Zugangsdaten für lmaa.space",
    html: await render(WelcomeEmail({ username, password, loginUrl: DASHBOARD_URL })),
  });
}

/**
 * Sends submission-approved confirmation to submitter.
 *
 * @param to - Recipient email address.
 * @param shopName - Approved shop name.
 * @returns Resolves when provider accepted the message.
 */
export async function sendSubmissionApproved(to: string, shopName: string): Promise<void> {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Dein Vorschlag „${shopName}" wurde aufgenommen!`,
    html: await render(ApprovedEmail({ shopName })),
  });
}

/**
 * Sends internal notification about a new public submission.
 *
 * @param shopName - Submitted shop name.
 * @param shopUrl - Submitted shop URL.
 * @param region - Optional shipping/region hints.
 * @param submitterNote - Optional submitter note.
 * @returns Resolves when provider accepted the message.
 */
export async function sendNewSubmissionNotification(
  shopName: string,
  shopUrl: string,
  region?: string[],
  submitterNote?: string,
): Promise<void> {
  if (!resend || !OWNER_EMAIL) return;

  await resend.emails.send({
    from: FROM,
    to: OWNER_EMAIL,
    subject: `Neuer Shop-Vorschlag: ${shopName}`,
    html: await render(
      NewSubmissionEmail({ shopName, shopUrl, region, submitterNote, dashboardUrl: DASHBOARD_URL }),
    ),
  });
}

/**
 * Sends internal notification about dead-link reports.
 *
 * @param shopName - Shop display name.
 * @param shopUrl - Shop URL.
 * @param reportCount - Current report count.
 * @returns Resolves when provider accepted the message.
 */
export async function sendDeadLinkReportNotification(
  shopName: string,
  shopUrl: string,
  reportCount: number,
): Promise<void> {
  if (!resend || !OWNER_EMAIL) return;

  await resend.emails.send({
    from: FROM,
    to: OWNER_EMAIL,
    subject: `Defekter Link gemeldet: ${shopName}`,
    html: await render(
      DeadLinkReportEmail({ shopName, shopUrl, reportCount, dashboardUrl: DASHBOARD_URL }),
    ),
  });
}

/**
 * Sends internal notification about shop concern reports.
 *
 * @param shopName - Shop display name.
 * @param shopUrl - Shop URL.
 * @param reason - Reporter-provided reason text.
 * @returns Resolves when provider accepted the message.
 */
export async function sendShopConcernNotification(
  shopName: string,
  shopUrl: string,
  reason: string,
): Promise<void> {
  if (!resend || !OWNER_EMAIL) return;

  await resend.emails.send({
    from: FROM,
    to: OWNER_EMAIL,
    subject: `Shop gemeldet: ${shopName}`,
    html: `<p><strong>${shopName}</strong> (<a href="${shopUrl}">${shopUrl}</a>) wurde gemeldet.</p><p><strong>Begründung:</strong><br>${reason.replace(/\n/g, "<br>")}</p>`,
  });
}

/**
 * Sends submission-rejected feedback to submitter.
 *
 * @param to - Recipient email address.
 * @param shopName - Rejected shop name.
 * @param reason - Optional rejection reason shown to user.
 * @returns Resolves when provider accepted the message.
 */
export async function sendSubmissionRejected(
  to: string,
  shopName: string,
  reason?: string,
): Promise<void> {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Dein Vorschlag „${shopName}" konnte nicht aufgenommen werden`,
    html: await render(RejectedEmail({ shopName, reason })),
  });
}
