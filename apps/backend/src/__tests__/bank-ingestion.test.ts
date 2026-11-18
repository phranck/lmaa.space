import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent", FRONTEND_URL: "https://lmaa.space" },
}));

const clientMocks = vi.hoisted(() => ({
  fetchTransactions: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  claimBankRead: vi.fn(),
  completeBankRead: vi.fn(),
  failBankRead: vi.fn(),
  getLastBookedThrough: vi.fn(),
  getLiveBankConnection: vi.fn(),
  insertDonation: vi.fn(),
  fillDonationPayerName: vi.fn(),
}));

const pendingMocks = vi.hoisted(() => ({
  takeOverPendingSponsorshipByReference: vi.fn(),
}));

const referenceMocks = vi.hoisted(() => ({
  wasSponsorshipReferenceIssued: vi.fn(),
}));

vi.mock("../services/enable-banking-client.js", () => clientMocks);
vi.mock("../services/pending-sponsorships.js", () => pendingMocks);
vi.mock("../repositories/pending-sponsorships.js", () => referenceMocks);
vi.mock("../repositories/bank-reads.js", () => ({
  claimBankRead: repositoryMocks.claimBankRead,
  completeBankRead: repositoryMocks.completeBankRead,
  failBankRead: repositoryMocks.failBankRead,
  getLastBookedThrough: repositoryMocks.getLastBookedThrough,
}));
vi.mock("../repositories/bank-connections.js", () => ({
  getLiveBankConnection: repositoryMocks.getLiveBankConnection,
}));
vi.mock("../repositories/donations.js", () => ({
  insertDonation: repositoryMocks.insertDonation,
  fillDonationPayerName: repositoryMocks.fillDonationPayerName,
}));
vi.mock("../services/bank-consent.js", () => ({
  announceConsentRefused: vi.fn(),
  announceConsentStage: vi.fn(),
}));

import { buildCreditorReference, formatCreditorReference } from "@lmaa/shared";

import { HttpError } from "../lib/http.js";
import { logger } from "../lib/logger.js";
import {
  carriesSiteMarker,
  classifyTransaction,
  findCreditorReference,
  namesOtherProject,
  runBankIngestion,
} from "../services/bank-ingestion.js";

/**
 * A reference of the shape the sponsor form issues: `SPON` and twelve drawn
 * characters.
 *
 * Built rather than written out, because the check digits are what these tests
 * turn on.
 */
const ISSUED = buildCreditorReference("SPON2ABCD3EFGH4J");

/**
 * A reference musiccloud issues on its own support page, which pays into the
 * same account: `MCSP` and twelve drawn characters.
 */
const MUSICCLOUD = buildCreditorReference("MCSP7Q2K9X4M8T3B");

/** A sound reference some other payee issued, such as a shop refunding an order. */
const MERCHANT = buildCreditorReference("539007547034");

/**
 * A reference that opens with this project's tag but has a body the sponsor
 * form never draws, so it cannot be one this project issued.
 */
const SPON_WRONG_LENGTH = buildCreditorReference("SPON2ABCD3EFGH4");

/**
 * What the driver throws when the entry is already in the ledger.
 *
 * The real wrapper around the real shape. Drizzle does not throw the driver's
 * error, it throws a `DrizzleQueryError` carrying it as `cause`, so a mock
 * rejecting with a bare `{ code }` certifies a shape that never reaches the
 * service.
 */
function entryAlreadyStored() {
  return new DrizzleQueryError(
    "insert into donations …",
    [],
    Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
      constraint_name: "idx_donations_external_ref",
    }),
  );
}

/** One entry of the account, with everything a decision needs. */
function transaction(overrides: Record<string, unknown> = {}) {
  return {
    entryReference: "entry-1",
    amountCents: 2_500,
    currency: "EUR",
    isCredit: true,
    bookedOn: "2026-09-01",
    remittanceLines: ["Spende: lmaa.space"],
    payerName: "Anna von Trapp",
    ...overrides,
  };
}

describe("finding a creditor reference", () => {
  const own = { kind: "own", reference: ISSUED };

  it("finds this project's reference standing alone on a line", () => {
    expect(findCreditorReference([ISSUED])).toEqual(own);
  });

  it("finds one inside a sentence, on whichever line it landed", () => {
    expect(findCreditorReference(["Ueberweisung", `Verwendungszweck ${ISSUED} danke`])).toEqual(
      own,
    );
  });

  it("reads one back that arrived in lower case", () => {
    // ISO/IEC 7064 reads the two cases as one number, so a bank that lowercased
    // it still hands back the reference that was issued.
    expect(findCreditorReference([ISSUED.toLowerCase()])).toEqual(own);
  });

  it("finds one printed in groups of four, the way the site shows it", () => {
    expect(findCreditorReference([`Spende ${formatCreditorReference(ISSUED)} danke`])).toEqual(own);
  });

  it("finds one a bank split across two lines", () => {
    const printed = formatCreditorReference(ISSUED);
    expect(findCreditorReference([printed.slice(0, 12), printed.slice(12)])).toEqual(own);
  });

  it("finds one followed by punctuation", () => {
    expect(findCreditorReference([`Ref.:${ISSUED}.`])).toEqual(own);
  });

  it("does not take one that runs on into other characters", () => {
    // Without a boundary the match swallowed what followed, and the reference
    // it then checked was not the one that was printed.
    expect(findCreditorReference([`${ISSUED}X`])?.kind).not.toBe("own");
  });

  it("does not take one glued onto a word in front of it", () => {
    expect(findCreditorReference([`ABC${ISSUED}`])).toBeNull();
  });

  it("refuses one whose check digits do not hold", () => {
    // A single character changed. The check digits are what stop a damaged
    // reference landing on somebody else's announcement.
    const damaged = `${ISSUED.slice(0, -1)}${ISSUED.endsWith("H") ? "J" : "H"}`;
    expect(findCreditorReference([damaged])).toBeNull();
  });

  it("calls another payee's sound reference foreign", () => {
    expect(findCreditorReference([`Erstattung ${MERCHANT}`])).toEqual({ kind: "foreign" });
  });

  it("calls a musiccloud reference foreign, printed either way", () => {
    expect(findCreditorReference([MUSICCLOUD])).toEqual({ kind: "foreign" });
    expect(findCreditorReference([formatCreditorReference(MUSICCLOUD)])).toEqual({
      kind: "foreign",
    });
  });

  it("calls a reference with this project's tag but another shape foreign", () => {
    expect(findCreditorReference([SPON_WRONG_LENGTH])).toEqual({ kind: "foreign" });
  });

  it("finds nothing in an ordinary remittance text", () => {
    expect(findCreditorReference(["Miete September", "Gehalt"])).toBeNull();
  });
});

describe("recognizing another project on the account", () => {
  it("finds musiccloud's host", () => {
    expect(namesOtherProject(["Spende musiccloud.io"])).toBe(true);
  });

  it("finds it whatever the case and spacing", () => {
    expect(namesOtherProject(["SPENDE:   MUSICCLOUD.IO"])).toBe(true);
  });

  it("finds nothing in a text naming this project alone", () => {
    expect(namesOtherProject(["Spende: lmaa.space"])).toBe(false);
  });
});

describe("recognising the site's own marker", () => {
  const marker = "lmaa.space";

  it("finds it whatever the case", () => {
    expect(carriesSiteMarker(["SPENDE: LMAA.SPACE"], marker)).toBe(true);
  });

  it("finds it inside a longer line", () => {
    expect(carriesSiteMarker(["Verwendungszweck Spende: lmaa.space vielen Dank"], marker)).toBe(
      true,
    );
  });

  it("finds it after a bank has stretched the spacing", () => {
    expect(carriesSiteMarker(["Spende:    lmaa.space"], marker)).toBe(true);
  });

  it("does not find it in an unrelated line", () => {
    expect(carriesSiteMarker(["Miete September", "Rewe Markt"], marker)).toBe(false);
  });

  it("matches nothing at all when there is no marker to match", () => {
    // An unconfigured host must not turn every entry of a private account into
    // a donation.
    expect(carriesSiteMarker(["anything at all"], "")).toBe(false);
  });
});

describe("deciding what an entry is", () => {
  const marker = "lmaa.space";

  it("takes a reference over a marker where both are there", () => {
    const decided = classifyTransaction(
      transaction({ remittanceLines: [`${ISSUED} Spende: lmaa.space`] }),
      marker,
    );
    expect(decided).toEqual({ kind: "sponsorship", reference: ISSUED });
  });

  it("takes the marker where there is no reference", () => {
    expect(classifyTransaction(transaction(), marker)).toEqual({ kind: "donation" });
  });

  it("takes a reference printed in groups of four", () => {
    const decided = classifyTransaction(
      transaction({ remittanceLines: [formatCreditorReference(ISSUED)] }),
      marker,
    );
    expect(decided).toEqual({ kind: "sponsorship", reference: ISSUED });
  });

  it("ignores everything else", () => {
    // A private account carries salary, rent and shopping, and none of it is a
    // donation.
    expect(classifyTransaction(transaction({ remittanceLines: ["Gehalt"] }), marker)).toEqual({
      kind: "ignore",
    });
  });

  it("ignores another payee's reference, even beside this site's host", () => {
    // A shop refunding an order to the private account carries its own
    // reference, and the payment is the shop's business rather than a gift.
    const decided = classifyTransaction(
      transaction({ remittanceLines: [`${MERCHANT} lmaa.space`] }),
      marker,
    );
    expect(decided).toEqual({ kind: "ignore" });
  });

  it("ignores a musiccloud sponsor's reference", () => {
    expect(classifyTransaction(transaction({ remittanceLines: [MUSICCLOUD] }), marker)).toEqual({
      kind: "ignore",
    });
  });

  it("ignores a musiccloud reference that also names this site", () => {
    const decided = classifyTransaction(
      transaction({ remittanceLines: [`${MUSICCLOUD} Spende lmaa.space`] }),
      marker,
    );
    expect(decided).toEqual({ kind: "ignore" });
  });

  it("ignores a text naming both projects", () => {
    // The money can only be counted once, and where the text does not say whose
    // it is, it belongs to neither ledger until a person decides.
    const decided = classifyTransaction(
      transaction({ remittanceLines: ["lmaa.space / musiccloud.io"] }),
      marker,
    );
    expect(decided).toEqual({ kind: "ignore" });
  });

  it("ignores this project's reference beside the other project's host", () => {
    const decided = classifyTransaction(
      transaction({ remittanceLines: [`${ISSUED} musiccloud.io`] }),
      marker,
    );
    expect(decided).toEqual({ kind: "ignore" });
  });

  it("ignores a text naming the other project alone", () => {
    expect(
      classifyTransaction(transaction({ remittanceLines: ["Spende musiccloud.io"] }), marker),
    ).toEqual({ kind: "ignore" });
  });

  it("refuses to book a payment in another currency", () => {
    // 100 dollars would otherwise be stored as 10000 cents and counted as euros.
    expect(classifyTransaction(transaction({ currency: "USD" }), marker)).toEqual({
      kind: "unbookable",
    });
  });

  it("refuses to book a payment that names no currency", () => {
    expect(classifyTransaction(transaction({ currency: "" }), marker)).toEqual({
      kind: "unbookable",
    });
  });

  it("refuses to book a payment of nothing", () => {
    expect(classifyTransaction(transaction({ amountCents: 0 }), marker)).toEqual({
      kind: "unbookable",
    });
  });

  it("refuses to book a payment whose amount the bank left empty", () => {
    // The client reads an empty amount as zero, so this is the entry it hands
    // over for one.
    const decided = classifyTransaction(
      transaction({ amountCents: 0, remittanceLines: [ISSUED] }),
      marker,
    );
    expect(decided).toEqual({ kind: "unbookable" });
  });

  it("leaves a foreign-currency entry that is not this project's ignored", () => {
    // Shopping abroad is nothing to do with the project, so it is not even
    // counted as skipped.
    expect(
      classifyTransaction(transaction({ currency: "USD", remittanceLines: ["Amazon"] }), marker),
    ).toEqual({ kind: "ignore" });
  });
});

describe("a run over the account", () => {
  const connection = {
    id: "c1",
    sessionId: "session-1",
    accountUid: "account-1",
    aspspName: "Erste Bank",
    aspspCountry: "AT",
    consentValidUntil: new Date("2027-01-01T00:00:00.000Z"),
    revokedAt: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Only the clock, so nothing here waits on a timer that never fires. The
    // range a run asks for is counted from today, which is what these tests
    // pin down.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-04T11:46:00.000Z"));
    repositoryMocks.getLiveBankConnection.mockResolvedValue(connection);
    repositoryMocks.claimBankRead.mockResolvedValue({ id: "read-1" });
    repositoryMocks.getLastBookedThrough.mockResolvedValue("2026-08-30");
    repositoryMocks.insertDonation.mockResolvedValue({ id: "d1" });
    repositoryMocks.fillDonationPayerName.mockResolvedValue(false);
    pendingMocks.takeOverPendingSponsorshipByReference.mockResolvedValue({ ok: true });
    referenceMocks.wasSponsorshipReferenceIssued.mockResolvedValue(true);
    clientMocks.fetchTransactions.mockResolvedValue({ transactions: [], continuationKey: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing whilst no connection is in force", async () => {
    repositoryMocks.getLiveBankConnection.mockResolvedValue(null);

    expect(await runBankIngestion("background")).toEqual({ ran: false, reason: "not_connected" });
    expect(clientMocks.fetchTransactions).not.toHaveBeenCalled();
  });

  it("writes nothing once the consent has lapsed", async () => {
    // A lapsed connection must never read as a period without donations, so it
    // stops rather than recording a day on which it found nothing.
    repositoryMocks.getLiveBankConnection.mockResolvedValue({
      ...connection,
      consentValidUntil: new Date("2020-01-01T00:00:00.000Z"),
    });

    expect(await runBankIngestion("background")).toEqual({ ran: false, reason: "consent_expired" });
    expect(clientMocks.fetchTransactions).not.toHaveBeenCalled();
    expect(repositoryMocks.completeBankRead).not.toHaveBeenCalled();
  });

  it("does not ask the bank when the budget for the window is spent", async () => {
    repositoryMocks.claimBankRead.mockResolvedValue(null);

    expect(await runBankIngestion("background")).toEqual({ ran: false, reason: "budget_spent" });
    expect(clientMocks.fetchTransactions).not.toHaveBeenCalled();
  });

  it("reaches five days back from today, whatever it read last", async () => {
    // Counted from today rather than from the last recorded day. A day is not
    // finished because a run looked at it once, and a payment booked in the
    // afternoon or posted late by the bank falls inside this window.
    vi.setSystemTime(new Date("2026-09-04T11:46:00.000Z"));
    repositoryMocks.getLastBookedThrough.mockResolvedValue("2026-08-30");

    await runBankIngestion("background");

    expect(clientMocks.fetchTransactions).toHaveBeenCalledWith(
      "account-1",
      { from: "2026-08-30", to: "2026-09-04" },
      undefined,
    );
  });

  it("asks for a range the bank can answer when it already read today", async () => {
    // The bank refuses a range whose start is after its end with a 422, which
    // is what made every read after the first one of a day fail.
    vi.setSystemTime(new Date("2026-09-04T11:46:00.000Z"));
    repositoryMocks.getLastBookedThrough.mockResolvedValue("2026-09-04");

    await runBankIngestion("manual");

    const [, range] = clientMocks.fetchTransactions.mock.calls[0];
    expect(range.from <= range.to).toBe(true);
    expect(range).toMatchObject({ from: "2026-08-30", to: "2026-09-04" });
  });

  it("reaches ninety days back on the very first run", async () => {
    // Nothing is recorded yet, and the account may already carry months of
    // payments.
    vi.setSystemTime(new Date("2026-09-04T11:46:00.000Z"));
    repositoryMocks.getLastBookedThrough.mockResolvedValue(null);

    await runBankIngestion("background");

    expect(clientMocks.fetchTransactions).toHaveBeenCalledWith(
      "account-1",
      { from: "2026-06-06", to: "2026-09-04" },
      undefined,
    );
  });

  it("records why a read failed instead of letting the failure escape", async () => {
    // Escaping left the claimed read at its defaults, so the card reported a
    // failure with no reason and the reason lived only in a log the operator
    // cannot read.
    clientMocks.fetchTransactions.mockRejectedValue(
      new HttpError(502, "The bank interface refused the request", "bank_request_refused"),
    );

    const result = await runBankIngestion("manual");

    expect(result).toEqual({ ran: false, reason: "read_failed", failure: "bank_request_refused" });
    expect(repositoryMocks.failBankRead).toHaveBeenCalledWith("read-1", "bank_request_refused");
    expect(repositoryMocks.completeBankRead).not.toHaveBeenCalled();
  });

  it("names a failure the bank client did not, rather than showing nothing", async () => {
    clientMocks.fetchTransactions.mockRejectedValue(new Error("something else entirely"));

    const result = await runBankIngestion("manual");

    expect(result).toEqual({ ran: false, reason: "read_failed", failure: "bank_unknown_error" });
    expect(repositoryMocks.failBankRead).toHaveBeenCalledWith("read-1", "bank_unknown_error");
  });

  it("reads a payment booked after the run that already covered its day", async () => {
    // The afternoon payment the old arithmetic lost: the morning run recorded
    // the day as read, and no later run ever asked for it again.
    vi.setSystemTime(new Date("2026-09-05T08:00:00.000Z"));
    repositoryMocks.getLastBookedThrough.mockResolvedValue("2026-09-04");
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ bookedOn: "2026-09-04" })],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    const [, range] = clientMocks.fetchTransactions.mock.calls[0];
    expect(range.from <= "2026-09-04").toBe(true);
    expect(result).toMatchObject({ ran: true, imported: 1 });
  });

  it("takes an ordinary donation into the ledger", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction()],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ ran: true, read: 1, imported: 1, skipped: 0 });
    expect(repositoryMocks.insertDonation).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 2_500,
        receivedAt: "2026-09-01",
        externalRef: "sepa:entry-1",
        // The whole name in one field, because the statement gives one string
        // and splitting it would guess where the given name ends.
        name: "Anna von Trapp",
        sponsorId: null,
      }),
    );
  });

  it("records a payment whose statement named nobody without a name", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ payerName: "" })],
      continuationKey: null,
    });

    await runBankIngestion("background");

    expect(repositoryMocks.insertDonation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "" }),
    );
  });

  it("cuts a name at what the editor will accept back", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ payerName: "N".repeat(120) })],
      continuationKey: null,
    });

    await runBankIngestion("background");

    expect(repositoryMocks.insertDonation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "N".repeat(80) }),
    );
  });

  it("turns a matched reference into a sponsor rather than a bare payment", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ remittanceLines: [ISSUED] })],
      continuationKey: null,
    });

    await runBankIngestion("background");

    expect(pendingMocks.takeOverPendingSponsorshipByReference).toHaveBeenCalledWith(
      ISSUED,
      expect.objectContaining({ amountCents: 2_500, externalRef: "sepa:entry-1" }),
    );
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
  });

  it("still records a payment under a reference it issued whose announcement is gone", async () => {
    // A reference already taken over, or one whose announcement ran out, looks
    // exactly like this. The project issued it, and the money still arrived.
    pendingMocks.takeOverPendingSponsorshipByReference.mockResolvedValue({ ok: false });
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ remittanceLines: [ISSUED] })],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(referenceMocks.wasSponsorshipReferenceIssued).toHaveBeenCalledWith(ISSUED);
    expect(result).toMatchObject({ imported: 1 });
    expect(repositoryMocks.insertDonation).toHaveBeenCalledTimes(1);
  });

  it("books nothing under a reference of this shape it never issued", async () => {
    // A reference anybody can build with the right check digits is not a
    // payment to this project until this project is the one that issued it.
    pendingMocks.takeOverPendingSponsorshipByReference.mockResolvedValue({ ok: false });
    referenceMocks.wasSponsorshipReferenceIssued.mockResolvedValue(false);
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ remittanceLines: [`${ISSUED} lmaa.space`] })],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ read: 1, imported: 0, filled: 0, skipped: 0 });
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
  });

  it("never books a musiccloud sponsor's transfer", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ remittanceLines: [MUSICCLOUD, "Spende musiccloud.io"] })],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ read: 1, imported: 0, skipped: 0 });
    expect(pendingMocks.takeOverPendingSponsorshipByReference).not.toHaveBeenCalled();
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
  });

  it("skips a payment it cannot book and counts it in the log line alone", async () => {
    const info = vi.spyOn(logger, "info");
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [
        transaction({ currency: "USD" }),
        transaction({ entryReference: "entry-2", amountCents: 0 }),
      ],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ read: 2, imported: 0, filled: 0, skipped: 0 });
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
    const finished = info.mock.calls.find(
      ([fields]) => (fields as { event?: string }).event === "bank_ingestion.finished",
    );
    expect(finished?.[0]).toMatchObject({ unbookable: 2 });
    // The count and nothing else: no amount and no remittance text.
    const logged = JSON.stringify(finished);
    expect(logged).not.toContain("lmaa.space");
    expect(logged).not.toContain("2500");
    info.mockRestore();
  });

  it("never takes money leaving the account, however it is marked", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ isCredit: false })],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ read: 1, imported: 0 });
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
  });

  it("leaves everything it does not recognise alone", async () => {
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [
        transaction({ remittanceLines: ["Gehalt August"] }),
        transaction({ entryReference: "entry-2", remittanceLines: ["Miete"] }),
      ],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ read: 2, imported: 0, skipped: 0 });
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
  });

  it("counts an entry it has already stored as skipped rather than failing", async () => {
    repositoryMocks.insertDonation.mockRejectedValue(entryAlreadyStored());
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction()],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ imported: 0, filled: 0, skipped: 1 });
  });

  it("gives a payment it already holds the name it was stored without", async () => {
    repositoryMocks.insertDonation.mockRejectedValue(entryAlreadyStored());
    repositoryMocks.fillDonationPayerName.mockResolvedValue(true);
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction()],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(repositoryMocks.fillDonationPayerName).toHaveBeenCalledWith(
      "sepa:entry-1",
      "Anna von Trapp",
    );
    // Apart from skipped, because a run that repaired rows and one that
    // changed nothing must not report themselves the same way.
    expect(result).toMatchObject({ imported: 0, filled: 1, skipped: 0 });
  });

  it("leaves a payment it already holds complete alone", async () => {
    repositoryMocks.insertDonation.mockRejectedValue(entryAlreadyStored());
    repositoryMocks.fillDonationPayerName.mockResolvedValue(false);
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction()],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ filled: 0, skipped: 1 });
  });

  it("walks the pages the bank offers", async () => {
    clientMocks.fetchTransactions
      .mockResolvedValueOnce({ transactions: [transaction()], continuationKey: "next" })
      .mockResolvedValueOnce({
        transactions: [transaction({ entryReference: "entry-2" })],
        continuationKey: null,
      });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ read: 2, imported: 2 });
    expect(clientMocks.fetchTransactions).toHaveBeenLastCalledWith(
      "account-1",
      expect.anything(),
      "next",
    );
  });

  it("records what it reached, so the next run starts after it", async () => {
    await runBankIngestion("background");

    expect(repositoryMocks.completeBankRead).toHaveBeenCalledWith(
      "read-1",
      expect.objectContaining({ transactionsRead: 0, imported: 0, filled: 0, skipped: 0 }),
    );
  });

  it("asks the bank for the day it was given rather than its own window", async () => {
    await runBankIngestion("manual", { from: "2026-06-01" });

    expect(clientMocks.fetchTransactions).toHaveBeenCalledWith(
      "account-1",
      { from: "2026-06-01", to: "2026-09-04" },
      undefined,
    );
  });

  it("takes its own window where nobody asked for a day", async () => {
    await runBankIngestion("manual");

    expect(clientMocks.fetchTransactions).toHaveBeenCalledWith(
      "account-1",
      { from: "2026-08-30", to: "2026-09-04" },
      undefined,
    );
  });

  it("ignores a day that falls after today, which the bank would refuse", async () => {
    await runBankIngestion("manual", { from: "2027-01-01" });

    expect(clientMocks.fetchTransactions).toHaveBeenCalledWith(
      "account-1",
      { from: "2026-08-30", to: "2026-09-04" },
      undefined,
    );
  });
});
