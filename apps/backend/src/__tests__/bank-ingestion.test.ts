import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent", FRONTEND_URL: "https://lmaa.space" },
}));

const clientMocks = vi.hoisted(() => ({
  fetchTransactions: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  claimBankRead: vi.fn(),
  completeBankRead: vi.fn(),
  getLastBookedThrough: vi.fn(),
  getLiveBankConnection: vi.fn(),
  insertDonation: vi.fn(),
}));

const pendingMocks = vi.hoisted(() => ({
  takeOverPendingSponsorshipByReference: vi.fn(),
}));

vi.mock("../services/enable-banking-client.js", () => clientMocks);
vi.mock("../services/pending-sponsorships.js", () => pendingMocks);
vi.mock("../repositories/bank-reads.js", () => ({
  claimBankRead: repositoryMocks.claimBankRead,
  completeBankRead: repositoryMocks.completeBankRead,
  getLastBookedThrough: repositoryMocks.getLastBookedThrough,
}));
vi.mock("../repositories/bank-connections.js", () => ({
  getLiveBankConnection: repositoryMocks.getLiveBankConnection,
}));
vi.mock("../repositories/donations.js", () => ({
  insertDonation: repositoryMocks.insertDonation,
}));
vi.mock("../services/bank-consent.js", () => ({
  announceConsentRefused: vi.fn(),
  announceConsentStage: vi.fn(),
}));

import {
  carriesSiteMarker,
  classifyTransaction,
  findIssuedReference,
  runBankIngestion,
} from "../services/bank-ingestion.js";

/**
 * A reference of the shape the sponsor form issues, with its real check digits.
 *
 * Built by `buildCreditorReference("SPON2ABCD3EFGH4")` rather than written out
 * from memory, because the check digits are what these tests turn on.
 */
const ISSUED = "RF35SPON2ABCD3EFGH4";

/** One entry of the account, with everything a decision needs. */
function transaction(overrides: Record<string, unknown> = {}) {
  return {
    entryReference: "entry-1",
    amountCents: 2_500,
    currency: "EUR",
    isCredit: true,
    bookedOn: "2026-09-01",
    remittanceLines: ["Spende: lmaa.space"],
    ...overrides,
  };
}

describe("finding a reference this project issued", () => {
  it("finds one standing alone on a line", () => {
    expect(findIssuedReference([ISSUED])).toBe(ISSUED);
  });

  it("finds one inside a sentence, on whichever line it landed", () => {
    expect(findIssuedReference(["Ueberweisung", `Verwendungszweck ${ISSUED} danke`])).toBe(ISSUED);
  });

  it("reads one back that arrived in lower case", () => {
    // ISO/IEC 7064 reads the two cases as one number, so a bank that lowercased
    // it still hands back the reference that was issued.
    expect(findIssuedReference([ISSUED.toLowerCase()])).toBe(ISSUED);
  });

  it("refuses one whose check digits do not hold", () => {
    // A single character changed. The check digits are what stop a damaged
    // reference landing on somebody else's announcement.
    const damaged = `${ISSUED.slice(0, -1)}${ISSUED.endsWith("H") ? "J" : "H"}`;
    expect(findIssuedReference([damaged])).toBeNull();
  });

  it("finds nothing in an ordinary remittance text", () => {
    expect(findIssuedReference(["Miete September", "Gehalt"])).toBeNull();
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

  it("ignores everything else", () => {
    // A private account carries salary, rent and shopping, and none of it is a
    // donation.
    expect(classifyTransaction(transaction({ remittanceLines: ["Gehalt"] }), marker)).toEqual({
      kind: "ignore",
    });
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
    repositoryMocks.getLiveBankConnection.mockResolvedValue(connection);
    repositoryMocks.claimBankRead.mockResolvedValue({ id: "read-1" });
    repositoryMocks.getLastBookedThrough.mockResolvedValue("2026-08-30");
    repositoryMocks.insertDonation.mockResolvedValue({ id: "d1" });
    pendingMocks.takeOverPendingSponsorshipByReference.mockResolvedValue({ ok: true });
    clientMocks.fetchTransactions.mockResolvedValue({ transactions: [], continuationKey: null });
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

  it("starts the day after the last finished run", async () => {
    await runBankIngestion("background");

    expect(clientMocks.fetchTransactions).toHaveBeenCalledWith(
      "account-1",
      expect.objectContaining({ from: "2026-08-31" }),
      undefined,
    );
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
        // The payer's name stands in the statement and is not taken.
        firstName: "",
        sponsorId: null,
      }),
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

  it("still records a payment whose reference no longer has an announcement", async () => {
    // A reference already taken over looks exactly like this, and the money
    // still arrived.
    pendingMocks.takeOverPendingSponsorshipByReference.mockResolvedValue({ ok: false });
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction({ remittanceLines: [ISSUED] })],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ imported: 1 });
    expect(repositoryMocks.insertDonation).toHaveBeenCalledTimes(1);
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
    repositoryMocks.insertDonation.mockRejectedValue({ code: "23505" });
    clientMocks.fetchTransactions.mockResolvedValue({
      transactions: [transaction()],
      continuationKey: null,
    });

    const result = await runBankIngestion("background");

    expect(result).toMatchObject({ imported: 0, skipped: 1 });
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
      expect.objectContaining({ transactionsRead: 0, imported: 0, skipped: 0 }),
    );
  });
});
