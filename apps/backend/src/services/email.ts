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
 * @param to - Recipient address.
 * @param subject - Email subject.
 * @param html - Rendered HTML body.
 * @param options.replyTo - Optional Reply-To address, sent as a custom header.
 * @param options.errorSource - Tag used when persisting a failure to background errors. Defaults to `"email"`.
 * @returns `true` if SMTP2GO accepted and delivered the message, `false` on error or when mail is disabled.
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
        ...(options?.replyTo
          ? { custom_headers: [{ header: "Reply-To", value: options.replyTo }] }
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
