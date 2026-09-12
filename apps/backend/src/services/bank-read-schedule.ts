import type { BankConnectionRow } from "../db/schema.js";
import { getReadTimesInWindow } from "../repositories/bank-reads.js";

/**
 * How often the account may be read, and when the next read of it is due.
 *
 * Apart from the run that carries the reads out, because the answer is also
 * what the dashboard shows, and a card asking when the next read happens has
 * no business pulling in the ledger, the bank client and the mail transport to
 * find out.
 */

/**
 * How many background reads Article 36(5) of Commission Delegated Regulation
 * (EU) 2018/389 allows whilst the account holder is not asking.
 */
export const BACKGROUND_READS_PER_WINDOW = 4;

/** The window that cap is measured over, sliding rather than per calendar day. */
export const READ_WINDOW_HOURS = 24;

/** The same window in milliseconds, for working out when it lets one through. */
export const READ_WINDOW_MS = READ_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * How many reads the button may make in the same window.
 *
 * The button falls under Article 36(5)(a), where the account holder asks for
 * the information themselves and no cap applies. The number here is not the
 * regulation, it is a guard against a stuck page pressing it in a loop.
 */
export const MANUAL_READS_PER_WINDOW = 60;

/**
 * How often the background run looks.
 *
 * Six hours meets both readings of the four-per-24-hours cap at once, so the
 * time of day it starts at does not matter.
 */
export const BACKGROUND_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * When the background run will next reach the bank.
 *
 * @param connection - The connection in force, or `null` where there is none.
 * @param now - The moment the question is asked.
 * @returns The time, `now` where the read is already due, and `null` where no
 *   background read is going to happen at all.
 *
 * @remarks
 * Two things have to let a read through, so the answer is the later of them.
 * The timer lets one through `BACKGROUND_INTERVAL_MS` after the last one, and
 * the budget lets one through once the window holds fewer than
 * `BACKGROUND_READS_PER_WINDOW`.
 *
 * The timer lives in a container and starts again with every deployment, so it
 * cannot be read here and the recorded reads answer in its place. A restart
 * brings the next tick forward rather than pushing it back, which makes this
 * the latest the next read is due rather than a promise about the minute.
 */
export async function nextBackgroundReadAt(
  connection: BankConnectionRow | null,
  now: Date,
): Promise<Date | null> {
  if (!connection) return null;
  // The same condition the run itself stops on. A lapsed consent is not a read
  // that is merely late, it is one that is not coming.
  if (connection.consentValidUntil && connection.consentValidUntil.getTime() <= now.getTime()) {
    return null;
  }

  const reads = await getReadTimesInWindow("background", READ_WINDOW_HOURS);
  const afterTimer = reads.length > 0 ? reads[0].getTime() + BACKGROUND_INTERVAL_MS : now.getTime();
  const afterBudget =
    reads.length >= BACKGROUND_READS_PER_WINDOW
      ? reads[reads.length - 1].getTime() + READ_WINDOW_MS
      : now.getTime();

  return new Date(Math.max(afterTimer, afterBudget));
}
