import { normalizeCreditorReference } from "@lmaa/shared";

import { announceConsentRefused, announceConsentStage } from "./bank-consent.js";
import { fetchTransactions, type BankTransaction } from "./enable-banking-client.js";
import { takeOverPendingSponsorshipByReference } from "./pending-sponsorships.js";
import { env } from "../config/env.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { logger } from "../lib/logger.js";
import { getLiveBankConnection } from "../repositories/bank-connections.js";
import {
  claimBankRead,
  completeBankRead,
  getLastBookedThrough,
  type BankReadKind,
} from "../repositories/bank-reads.js";
import { insertDonation } from "../repositories/donations.js";

/**
 * How many background reads Article 36(5) of Commission Delegated Regulation
 * (EU) 2018/389 allows whilst the account holder is not asking.
 */
const BACKGROUND_READS_PER_WINDOW = 4;

/** The window that cap is measured over, sliding rather than per calendar day. */
const READ_WINDOW_HOURS = 24;

/**
 * How many reads the button may make in the same window.
 *
 * The button falls under Article 36(5)(a), where the account holder asks for
 * the information themselves and no cap applies. The number here is not the
 * regulation, it is a guard against a stuck page pressing it in a loop.
 */
const MANUAL_READS_PER_WINDOW = 60;

/**
 * How often the background run looks.
 *
 * Six hours meets both readings of the four-per-24-hours cap at once, so the
 * time of day it starts at does not matter.
 */
const BACKGROUND_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** How far back the very first run reaches, in days. */
const FIRST_RUN_LOOKBACK_DAYS = 90;

/**
 * How many pages one run will walk before it stops.
 *
 * A continuation key that never comes back empty would otherwise make the run
 * endless. Twenty pages is far past a few days of a private account.
 */
const MAX_PAGES = 20;

/** Which route these payments took, as a key of `DONATION_PROVIDERS`. */
const PROVIDER = "sepa";

/** A day in milliseconds. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Why a run did nothing. */
export type BankIngestionSkip =
  | "not_connected"
  | "consent_expired"
  | "budget_spent"
  | "not_configured";

/** What a run did, or why it did nothing. */
export type BankIngestionResult =
  | { ran: true; from: string; to: string; read: number; imported: number; skipped: number }
  | { ran: false; reason: BankIngestionSkip };

/** A day as `YYYY-MM-DD`, which is how the ledger and the interface both state one. */
function toDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * The marker a payment has to carry to count as belonging to this project.
 *
 * The site's own host, taken from configuration rather than from the settings
 * text. The remittance line is written by a payer's bank, which shortens,
 * re-wraps and re-cases it, so the part worth matching is the one that names
 * the project and nothing around it. The configured remittance texts all
 * contain it, which is what makes them findable.
 *
 * @returns The host, lower case and without a leading `www.`.
 */
function siteMarker(): string {
  try {
    return new URL(env.FRONTEND_URL).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** One line of remittance text, with its spacing and case taken out. */
function flatten(line: string): string {
  return line.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Finds the reference this project issued, if the payment carries one.
 *
 * @param lines - The remittance text, line by line.
 * @returns The reference as it is stored, or `null`.
 *
 * @remarks
 * Every line is searched, because a bank splits a remittance text wherever it
 * likes and the reference may sit on any of them. The check digits decide: a
 * reference that arrived damaged fails them and is not treated as a match, so a
 * near miss never lands on somebody else's announcement.
 */
export function findIssuedReference(lines: string[]): string | null {
  for (const line of lines) {
    for (const candidate of line.toUpperCase().match(/RF[0-9]{2}[A-Z0-9]{1,21}/g) ?? []) {
      const reference = normalizeCreditorReference(candidate);
      if (reference) return reference;
    }
  }
  return null;
}

/**
 * Says whether a payment names this project in its remittance text.
 *
 * @param lines - The remittance text, line by line.
 * @param marker - The site's host.
 * @returns `true` when any line contains the marker.
 *
 * @remarks
 * Contained rather than equal, and case and spacing are taken out first. Exact
 * comparison would lose every payment whose text a bank shortened or a person
 * typed differently, and a stranger's remittance line does not carry this host
 * by accident.
 */
export function carriesSiteMarker(lines: string[], marker: string): boolean {
  if (!marker) return false;
  return lines.some((line) => flatten(line).includes(marker));
}

/**
 * Decides what one entry is, without looking anything up.
 *
 * @param transaction - The entry as it came back.
 * @param marker - The site's host.
 * @returns What to do with it.
 *
 * @remarks
 * The account is a private one, carrying salary, rent and shopping. Anything
 * this does not recognise is nothing to do with the project, and it leaves here
 * unstored, uncounted and unlogged. That is the whole reason the decision is a
 * positive list rather than a filter with an exception.
 */
export function classifyTransaction(
  transaction: BankTransaction,
  marker: string,
): { kind: "sponsorship"; reference: string } | { kind: "donation" } | { kind: "ignore" } {
  const reference = findIssuedReference(transaction.remittanceLines);
  if (reference) return { kind: "sponsorship", reference };
  if (carriesSiteMarker(transaction.remittanceLines, marker)) return { kind: "donation" };
  return { kind: "ignore" };
}

/** Takes one recognised payment into the ledger. */
async function importTransaction(
  transaction: BankTransaction,
  classified: { kind: "sponsorship"; reference: string } | { kind: "donation" },
): Promise<"imported" | "skipped"> {
  const externalRef = `${PROVIDER}:${transaction.entryReference}`;
  const payment = {
    amountCents: transaction.amountCents,
    paidAt: transaction.bookedOn,
    externalRef,
  };

  try {
    if (classified.kind === "sponsorship") {
      const taken = await takeOverPendingSponsorshipByReference(classified.reference, payment);
      // No announcement carries that reference any more, which is what a
      // reference already taken over looks like. The payment is still this
      // project's, so it goes into the ledger without a sponsor beside it.
      if (taken.ok) return "imported";
    }

    await insertDonation({
      // Empty on purpose. The payer's name stands in the statement and is a
      // third party's data nobody gave for this, so it is not taken. Where a
      // reference matched, the name came from the form its owner filled in.
      firstName: "",
      lastName: "",
      socialMedia: [],
      published: false,
      amountCents: transaction.amountCents,
      receivedAt: transaction.bookedOn,
      provider: PROVIDER,
      note: "",
      sponsorId: null,
      externalRef,
    });
    return "imported";
  } catch (error) {
    // The same entry read a second time. This is the ordinary case rather than
    // a fault, and it is counted rather than swallowed.
    if (isUniqueViolation(error)) return "skipped";
    throw error;
  }
}

/**
 * Reads the account and takes what belongs to this project into the ledger.
 *
 * @param kind - Whether the background job or a person asked.
 * @returns What the run did, or why it did nothing.
 *
 * @remarks
 * Nothing is written where the consent has lapsed. A lapsed connection must
 * never read as a period without donations, so the run stops and says so rather
 * than recording a day on which it found nothing.
 *
 * What goes to the log is how many entries were read, taken and skipped. No
 * amount, no reference, no remittance text and no account number, because the
 * account is private and most of what passes through here is somebody's
 * ordinary life.
 */
export async function runBankIngestion(kind: BankReadKind): Promise<BankIngestionResult> {
  const connection = await getLiveBankConnection();
  if (!connection) return { ran: false, reason: "not_connected" };

  const now = new Date();
  if (connection.consentValidUntil && connection.consentValidUntil.getTime() <= now.getTime()) {
    logger.warn({ event: "bank_ingestion.consent_expired" }, "bank consent has lapsed");
    // What actually happened rather than what the date predicted, so the owner
    // is told even where the bank withdrew earlier than it promised.
    await announceConsentRefused();
    return { ran: false, reason: "consent_expired" };
  }

  const claimed = await claimBankRead(
    kind,
    kind === "background" ? BACKGROUND_READS_PER_WINDOW : MANUAL_READS_PER_WINDOW,
    READ_WINDOW_HOURS,
  );
  if (!claimed) return { ran: false, reason: "budget_spent" };

  const lastBookedThrough = await getLastBookedThrough();
  const from = lastBookedThrough
    ? toDay(new Date(new Date(lastBookedThrough).getTime() + DAY_MS))
    : toDay(new Date(now.getTime() - FIRST_RUN_LOOKBACK_DAYS * DAY_MS));
  const to = toDay(now);

  const marker = siteMarker();
  let read = 0;
  let imported = 0;
  let skipped = 0;
  let continuationKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const answer = await fetchTransactions(connection.accountUid, { from, to }, continuationKey);
    read += answer.transactions.length;

    for (const transaction of answer.transactions) {
      const classified = classifyTransaction(transaction, marker);

      // Money leaving is never a donation. One that carries a marker is a
      // returned payment, which this run does not net off; it says so instead,
      // so the case is known if it ever happens.
      if (!transaction.isCredit) {
        if (classified.kind !== "ignore") {
          logger.warn(
            { event: "bank_ingestion.marked_debit", bookedOn: transaction.bookedOn },
            "a payment leaving the account carried this project's marker",
          );
        }
        continue;
      }

      if (classified.kind === "ignore") continue;

      const outcome = await importTransaction(transaction, classified);
      if (outcome === "imported") imported += 1;
      else skipped += 1;
    }

    if (!answer.continuationKey) break;
    continuationKey = answer.continuationKey;
  }

  await completeBankRead(claimed.id, {
    bookedThrough: to,
    transactionsRead: read,
    imported,
    skipped,
  });

  logger.info(
    { event: "bank_ingestion.finished", kind, from, to, read, imported, skipped },
    "bank account read",
  );

  return { ran: true, from, to, read, imported, skipped };
}

/**
 * Starts everything the bank connection does on its own, and does one round at
 * once.
 *
 * @returns The timer, so shutting down can stop it.
 *
 * @remarks
 * Two jobs on one timer, because both are about the same connection and both
 * want the same rhythm. The warning about a lapsing consent goes first and runs
 * whatever the read then does, since a consent that has run out is exactly when
 * the read will not happen.
 *
 * The interval is not what keeps the read inside its cap. A deployment restarts
 * it, and two containers briefly hold one each, so the cap comes from the
 * stored reads that `claimBankRead` counts. The interval only decides how often
 * the question is asked.
 */
export function startBankWorker(): NodeJS.Timeout {
  const tick = () => {
    void announceConsentStage().catch((error) => {
      logger.error({ err: error }, "bank consent warning failed");
    });
    void runBankIngestion("background").catch((error) => {
      logger.error({ err: error }, "bank ingestion failed");
    });
  };

  tick();
  const timer = setInterval(tick, BACKGROUND_INTERVAL_MS);
  logger.info({ intervalMs: BACKGROUND_INTERVAL_MS }, "bank worker started");
  return timer;
}
