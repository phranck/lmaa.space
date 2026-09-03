import { sendMail } from "./email.js";
import { sendPushNotification } from "./push-notifications.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { getOwner } from "../repositories/admin-users.js";
import { getLiveBankConnection, setConsentNoticeStage } from "../repositories/bank-connections.js";

/**
 * The warnings a lapsing consent produces, in the order they are reached.
 *
 * Three in half a year, and each of them once. More often and they stop being
 * read, which is the failure this exists to prevent.
 */
export const CONSENT_NOTICE_STAGES = ["soon", "imminent", "lapsed"] as const;

/** One rung of that staircase. */
export type ConsentNoticeStage = (typeof CONSENT_NOTICE_STAGES)[number];

/**
 * How many days before the consent lapses each rung is reached.
 *
 * Fourteen gives room without urgency and three catches whoever was away.
 * Warning earlier buys nothing, because renewing takes two minutes.
 */
const STAGE_DAYS: Record<Exclude<ConsentNoticeStage, "lapsed">, number> = {
  soon: 14,
  imminent: 3,
};

/** A day in milliseconds. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which rung a consent has reached, if any.
 *
 * @param validUntil - When the consent lapses, or `null` where none was stated.
 * @param now - The moment to measure against.
 * @returns The furthest rung reached, or `null` whilst there is still time.
 */
export function resolveConsentNoticeStage(
  validUntil: Date | null,
  now: Date,
): ConsentNoticeStage | null {
  if (!validUntil) return null;

  const remainingMs = validUntil.getTime() - now.getTime();
  if (remainingMs <= 0) return "lapsed";
  if (remainingMs < STAGE_DAYS.imminent * DAY_MS) return "imminent";
  if (remainingMs < STAGE_DAYS.soon * DAY_MS) return "soon";
  return null;
}

/**
 * Whether a rung still has to be announced.
 *
 * @param reached - The rung the consent has reached, or `null`.
 * @param announced - The furthest rung already announced, or `null`.
 * @returns `true` only for a rung further along than the last one sent.
 *
 * @remarks
 * The staircase only ever climbs. A consent cannot un-lapse, and a renewal
 * writes a new connection whose record of what was said starts empty, so
 * nothing has to be reset.
 */
export function shouldAnnounceStage(
  reached: ConsentNoticeStage | null,
  announced: string | null,
): boolean {
  if (!reached) return false;
  if (!announced) return true;

  const reachedIndex = CONSENT_NOTICE_STAGES.indexOf(reached);
  const announcedIndex = CONSENT_NOTICE_STAGES.indexOf(announced as ConsentNoticeStage);
  return reachedIndex > announcedIndex;
}

/** What each rung says, in the language the operator reads the dashboard in. */
const STAGE_TEXT: Record<ConsentNoticeStage, { subject: string; body: string }> = {
  soon: {
    subject: "Die Bankverbindung läuft in zwei Wochen ab",
    body: "Die Zustimmung für den Kontozugriff läuft bald ab. Erneuern dauert zwei Minuten und geht im Dashboard unter Sponsoring, Bankverbindung.",
  },
  imminent: {
    subject: "Die Bankverbindung läuft in drei Tagen ab",
    body: "Danach liest die Seite keine Zahlungseingänge mehr, und die Summe bleibt stehen. Erneuern im Dashboard unter Sponsoring, Bankverbindung.",
  },
  lapsed: {
    subject: "Die Bankverbindung ist abgelaufen",
    body: "Es werden keine Zahlungseingänge mehr gelesen. Die Summe auf der Seite bleibt auf dem letzten bekannten Stand, bis die Verbindung erneuert ist.",
  },
};

/** Where the operator goes to put it right. */
const BANK_CONNECTION_PATH = "/bank-connection";

/**
 * Tells the owner that a rung was reached, by email and by push.
 *
 * @param stage - The rung reached.
 *
 * @remarks
 * Lets a failure through. The rung is recorded only once this has returned, so
 * a warning that did not go out is not counted as said and is tried again at
 * the next tick. The worker that calls it catches and logs, which keeps the
 * read that follows from being lost with it.
 */
async function announce(stage: ConsentNoticeStage): Promise<void> {
  const { subject, body } = STAGE_TEXT[stage];
  const owner = await getOwner();

  if (env.OWNER_EMAIL) {
    const link = `${env.DASHBOARD_URL}${BANK_CONNECTION_PATH}`;
    await sendMail(env.OWNER_EMAIL, subject, `<p>${body}</p><p><a href="${link}">${link}</a></p>`, {
      errorSource: "bank-consent-notice",
    });
  }

  if (owner) {
    await sendPushNotification(owner.id, { title: subject, body, url: BANK_CONNECTION_PATH });
  }
}

/**
 * Warns about a lapsing consent, at most once per rung.
 *
 * @param now - The moment to measure against.
 *
 * @remarks
 * Reached rungs are recorded on the connection, so a restart, a second
 * container or a fourth run of the day cannot repeat one.
 */
export async function announceConsentStage(now = new Date()): Promise<void> {
  const connection = await getLiveBankConnection();
  if (!connection) return;

  const reached = resolveConsentNoticeStage(connection.consentValidUntil, now);
  if (!shouldAnnounceStage(reached, connection.consentNoticeStage)) return;

  await announce(reached as ConsentNoticeStage);
  await setConsentNoticeStage(connection.id, reached as ConsentNoticeStage);

  logger.warn(
    { event: "bank_consent.announced", stage: reached },
    "the bank consent is running out",
  );
}

/**
 * Warns that a read was actually refused, whatever the stored date says.
 *
 * @remarks
 * The date is only what the bank promised when it granted the consent; it may
 * withdraw earlier. A refused read is what happened rather than what was
 * expected, so it warns on its own trigger.
 *
 * It shares the recorded rung with the staircase above, because both say the
 * same thing to the same person and saying it twice is the thing this design is
 * against. Whichever notices first sends, and the other stays quiet.
 */
export async function announceConsentRefused(): Promise<void> {
  const connection = await getLiveBankConnection();
  if (!connection) return;
  if (!shouldAnnounceStage("lapsed", connection.consentNoticeStage)) return;

  await announce("lapsed");
  await setConsentNoticeStage(connection.id, "lapsed");

  logger.warn({ event: "bank_consent.refused" }, "the bank refused a read: consent has lapsed");
}
