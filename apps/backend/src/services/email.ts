import { recordBackgroundError } from "./background-errors.js";
import { env } from "../config/env.js";
import { isEmailRecipient } from "../lib/email-address.js";
import { logger } from "../lib/logger.js";

/**
 * SMTP2GO send endpoint. The EU host keeps message processing and data within
 * the Amsterdam data center (EU residency), which the global host would not
 * guarantee.
 */
const SMTP2GO_ENDPOINT = "https://eu-api.smtp2go.com/v3/email/send";

const apiKey = env.SMTP2GO_API_KEY ?? null;
const FROM = env.EMAIL_FROM;

logger.info(
  { configured: apiKey !== null, from: FROM, ownerEmail: env.OWNER_EMAIL ?? "(not set)" },
  "email service initialized",
);

/**
 * Shape of the SMTP2GO `/v3/email/send` response we care about. An HTTP 200 can
 * still report per-recipient failures, so `succeeded`/`failed` must be inspected
 * — a plain `response.ok` check is not sufficient.
 */
interface Smtp2goResponse {
  data?: {
    succeeded?: number;
    failed?: number;
    failures?: unknown[];
    error?: string;
    error_code?: string;
  };
}

/**
 * Sends a plain email via SMTP2GO's EU HTTP API.
 *
 * The sender is taken from `EMAIL_FROM` and the API key from `SMTP2GO_API_KEY`.
 * When the key is unset (e.g. local dev) sending is skipped rather than failing.
 * An empty or malformed recipient is treated as a no-op, not a provider error.
 *
 * @param to - Recipient address. Must be a single well-formed address; anything else is refused without contacting the provider.
 * @param subject - Email subject.
 * @param html - Rendered HTML body.
 * @param options.replyTo - Optional Reply-To address, sent as a custom header. Dropped when it is not a single well-formed address.
 * @param options.errorSource - Tag used when persisting a failure to background errors. Defaults to `"email"`.
 * @returns `true` if SMTP2GO accepted and delivered the message, `false` on error or when mail is disabled.
 *
 * @remarks
 * Both `to` and `replyTo` become mail headers and may carry values submitted
 * through a public form, so both pass {@link isEmailRecipient} first. An
 * unusable `to` stops the send; an unusable `replyTo` is dropped and logged so
 * the message still goes out without it.
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  options?: { replyTo?: string; errorSource?: string },
): Promise<boolean> {
  if (!apiKey) {
    logger.warn("email skipped: SMTP2GO_API_KEY not set");
    return false;
  }

  // An empty or malformed recipient is a caller no-op, not a provider failure:
  // do not call the provider (it returns a 422) and do not record an error.
  if (!isEmailRecipient(to)) {
    logger.warn({ subject }, "email skipped: invalid recipient address");
    return false;
  }

  // A Reply-To that is not a single well-formed address is dropped rather than
  // sent. The value can come from a public form field, and it would otherwise
  // reach the provider as a header value.
  const replyTo = options?.replyTo;
  const usableReplyTo = isEmailRecipient(replyTo) ? replyTo : undefined;
  if (replyTo !== undefined && usableReplyTo === undefined) {
    logger.warn({ subject }, "email reply-to dropped: invalid address");
  }

  const errorSource = options?.errorSource ?? "email";
  logger.info({ to, subject, from: FROM }, "sending email");

  try {
    const response = await fetch(SMTP2GO_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Smtp2go-Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: FROM,
        to: [to],
        subject,
        html_body: html,
        ...(usableReplyTo
          ? { custom_headers: [{ header: "Reply-To", value: usableReplyTo }] }
          : {}),
      }),
    });

    const result = (await response.json().catch(() => null)) as Smtp2goResponse | null;
    const data = result?.data;
    const accepted = response.ok && (data?.succeeded ?? 0) >= 1 && (data?.failed ?? 0) === 0;

    if (!accepted) {
      // Shape the error so the dashboard's Provider-{Fehler,Meldung,Status}
      // columns (error.name / error.message / error.status) stay populated.
      void recordBackgroundError(
        errorSource,
        {
          name: data?.error_code ?? "smtp2go_error",
          message: data?.error ?? "SMTP2GO did not accept the message",
          status: response.status,
        },
        { to, subject },
      );
      return false;
    }

    logger.info({ succeeded: data?.succeeded }, "email sent");
    return true;
  } catch (err) {
    void recordBackgroundError(errorSource, err, { to, subject });
    return false;
  }
}
