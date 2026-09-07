import { beforeEach, describe, expect, it, vi } from "vitest";

// A real key, because the client signs with it before every request and a
// placeholder would fail there rather than at the thing under test. Generated
// inside `vi.hoisted`, since `vi.mock` runs before anything at file scope.
const credentials = vi.hoisted(async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { privateKey: privateKey.export({ type: "pkcs1", format: "pem" }).toString() };
});

vi.mock("../config/env.js", async () => ({
  env: {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    ENABLE_BANKING_APPLICATION_ID: "application-id",
    ENABLE_BANKING_PRIVATE_KEY: (await credentials).privateKey,
  },
}));

import { fetchTransactions } from "../services/enable-banking-client.js";

const ACCOUNT_UID = "account-uid";
const RANGE = { from: "2026-09-01", to: "2026-09-07" };

/** One entry as the interface writes it, with everything the client reads. */
function entry(overrides: Record<string, unknown> = {}) {
  return {
    entry_reference: "entry-1",
    transaction_amount: { currency: "EUR", amount: "25.00" },
    credit_debit_indicator: "CRDT",
    booking_date: "2026-09-01",
    remittance_information: ["Spende: lmaa.space"],
    debtor: { name: "Anna von Trapp" },
    ...overrides,
  };
}

/** Answers the next request with this payload and nothing else. */
function answerWith(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }))),
  );
}

describe("reading the payer out of an entry", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("takes the name the statement gives the debtor", async () => {
    answerWith({ transactions: [entry()] });

    const page = await fetchTransactions(ACCOUNT_UID, RANGE);

    expect(page.transactions[0]?.payerName).toBe("Anna von Trapp");
  });

  it("reads an entry that names nobody as having no payer", async () => {
    answerWith({ transactions: [entry({ debtor: undefined })] });

    const page = await fetchTransactions(ACCOUNT_UID, RANGE);

    expect(page.transactions[0]?.payerName).toBe("");
  });

  it("reads a debtor without a name as having no payer", async () => {
    answerWith({ transactions: [entry({ debtor: {} })] });

    const page = await fetchTransactions(ACCOUNT_UID, RANGE);

    expect(page.transactions[0]?.payerName).toBe("");
  });

  it("takes the padding a bank puts around a name off it", async () => {
    answerWith({ transactions: [entry({ debtor: { name: "  Anna von Trapp  " } })] });

    const page = await fetchTransactions(ACCOUNT_UID, RANGE);

    expect(page.transactions[0]?.payerName).toBe("Anna von Trapp");
  });

  it("keeps reading an entry whose party the interface sent as null", async () => {
    answerWith({ transactions: [entry({ debtor: null })] });

    const page = await fetchTransactions(ACCOUNT_UID, RANGE);

    expect(page.transactions[0]).toMatchObject({ entryReference: "entry-1", payerName: "" });
  });

  it("carries no address off the party, whatever the interface sent", async () => {
    answerWith({
      transactions: [
        entry({
          debtor: { name: "Anna von Trapp", postal_address: { street_name: "Hauptstrasse" } },
        }),
      ],
    });

    const page = await fetchTransactions(ACCOUNT_UID, RANGE);

    expect(JSON.stringify(page.transactions[0])).not.toContain("Hauptstrasse");
  });
});
