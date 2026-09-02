import type { BankConnectionStatus } from "@lmaa/contracts";

/**
 * How many days before the consent lapses the dashboard starts saying so.
 *
 * Fourteen days give room without urgency, and renewing takes two minutes, so
 * warning earlier buys nothing. The staircase of notifications in #269 counts
 * from the same number, which is why it is stated once here rather than beside
 * each thing that reads it.
 */
export const CONSENT_WARNING_DAYS = 14;

/** Milliseconds in a day, for reading the window above. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What the dashboard says about the bank connection, in one word.
 *
 * `unconfigured` means the site holds no credential at all, which is a
 * different thing from holding one and not having connected with it.
 */
export type BankConnectionState =
  | "unconfigured"
  | "disconnected"
  | "expired"
  | "expiring"
  | "connected";

/**
 * Works out which of the states the connection is in.
 *
 * @param status - What the backend reports, straight from its own database.
 * @param now - The moment to measure the consent against.
 * @returns The state, which decides both the wording and the colour.
 *
 * @remarks
 * A connection whose consent carries no end date counts as connected. The date
 * is what the bank said when it granted the consent, and its absence says
 * nothing was promised rather than that something ran out.
 */
export function resolveBankConnectionState(
  status: BankConnectionStatus,
  now: Date,
): BankConnectionState {
  if (!status.configured) return "unconfigured";
  if (!status.connected) return "disconnected";
  if (!status.consentValidUntil) return "connected";

  const remainingMs = new Date(status.consentValidUntil).getTime() - now.getTime();
  if (Number.isNaN(remainingMs)) return "connected";
  if (remainingMs <= 0) return "expired";
  if (remainingMs < CONSENT_WARNING_DAYS * DAY_MS) return "expiring";
  return "connected";
}
