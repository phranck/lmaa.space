import { render } from "@react-email/components";
import { Resend } from "resend";
import { ApprovedEmail } from "../emails/ApprovedEmail.js";
import { RejectedEmail } from "../emails/RejectedEmail.js";
import { WelcomeEmail } from "../emails/WelcomeEmail.js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "hallo@lmaa.space";
const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "https://dashboard.lmaa.space";

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export async function sendWelcomeEmail(to: string, username: string, password: string): Promise<void> {
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
