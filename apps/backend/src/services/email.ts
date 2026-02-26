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

export function isEmailConfigured(): boolean {
  return resend !== null;
}

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

export async function sendSubmissionApproved(to: string, shopName: string): Promise<void> {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Dein Vorschlag „${shopName}" wurde aufgenommen!`,
    html: await render(ApprovedEmail({ shopName })),
  });
}

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
