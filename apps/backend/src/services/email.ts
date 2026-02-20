import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "noreply@dein.shop";

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export async function sendSubmissionApproved(
  to: string,
  shopName: string,
): Promise<void> {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Dein Vorschlag "${shopName}" wurde aufgenommen!`,
    html: `
      <p>Hallo,</p>
      <p>wir freuen uns, dir mitteilen zu können, dass dein Vorschlag
      <strong>${shopName}</strong> in die Liste auf <a href="https://dein.shop">dein.shop</a>
      aufgenommen wurde!</p>
      <p>Vielen Dank für deinen Beitrag zur Community.</p>
      <p>Das dein.shop-Team</p>
    `,
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
    subject: `Dein Vorschlag "${shopName}" konnte nicht aufgenommen werden`,
    html: `
      <p>Hallo,</p>
      <p>leider können wir deinen Vorschlag <strong>${shopName}</strong>
      aktuell nicht in unsere Liste aufnehmen.</p>
      ${reason ? `<p>Grund: ${reason}</p>` : ""}
      <p>Du kannst jederzeit einen neuen Vorschlag auf
      <a href="https://dein.shop/vorschlagen">dein.shop/vorschlagen</a> einreichen.</p>
      <p>Das dein.shop-Team</p>
    `,
  });
}
