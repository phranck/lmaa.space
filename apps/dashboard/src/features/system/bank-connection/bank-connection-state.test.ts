import { describe, expect, it } from "vitest";

import type { BankConnectionStatus } from "@lmaa/contracts";

import { CONSENT_WARNING_DAYS, resolveBankConnectionState } from "./bank-connection-state.ts";

const NOW = new Date("2026-09-03T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

/** A status with a live connection, which each case then bends. */
function status(overrides: Partial<BankConnectionStatus> = {}): BankConnectionStatus {
  return {
    configured: true,
    connected: true,
    institutionName: "Erste Bank",
    institutionCountry: "AT",
    consentValidUntil: new Date(NOW.getTime() + 180 * DAY_MS).toISOString(),
    connectedAt: NOW.toISOString(),
    lastReadAt: null,
    lastReadSucceeded: null,
    lastReadImported: 0,
    lastReadFailure: null,
    ...overrides,
  };
}

/** A consent lapsing this many days from `NOW`. */
function lapsingInDays(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString();
}

describe("the state of the bank connection", () => {
  it("is unconfigured when the site holds no credential", () => {
    expect(resolveBankConnectionState(status({ configured: false }), NOW)).toBe("unconfigured");
  });

  it("says unconfigured even where a connection is somehow still recorded", () => {
    // The credential going away does not delete what was connected with it, and
    // the missing credential is the more useful thing to say.
    expect(resolveBankConnectionState(status({ configured: false, connected: true }), NOW)).toBe(
      "unconfigured",
    );
  });

  it("is disconnected when nothing is in force", () => {
    expect(
      resolveBankConnectionState(
        status({ connected: false, consentValidUntil: null, connectedAt: null }),
        NOW,
      ),
    ).toBe("disconnected");
  });

  it("is connected whilst the consent is far off", () => {
    expect(resolveBankConnectionState(status(), NOW)).toBe("connected");
  });

  it("is connected on the day before the warning window opens", () => {
    expect(
      resolveBankConnectionState(
        status({ consentValidUntil: lapsingInDays(CONSENT_WARNING_DAYS + 1) }),
        NOW,
      ),
    ).toBe("connected");
  });

  it("is expiring once the consent is inside the warning window", () => {
    expect(
      resolveBankConnectionState(
        status({ consentValidUntil: lapsingInDays(CONSENT_WARNING_DAYS - 1) }),
        NOW,
      ),
    ).toBe("expiring");
  });

  it("is expiring an hour before the consent lapses", () => {
    expect(
      resolveBankConnectionState(
        status({ consentValidUntil: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString() }),
        NOW,
      ),
    ).toBe("expiring");
  });

  it("is expired at the very moment the consent lapses", () => {
    expect(resolveBankConnectionState(status({ consentValidUntil: NOW.toISOString() }), NOW)).toBe(
      "expired",
    );
  });

  it("is expired once the consent lies behind", () => {
    expect(resolveBankConnectionState(status({ consentValidUntil: lapsingInDays(-1) }), NOW)).toBe(
      "expired",
    );
  });

  it("counts a connection without an end date as connected", () => {
    // The date is what the bank promised. Its absence says nothing was promised
    // rather than that something ran out.
    expect(resolveBankConnectionState(status({ consentValidUntil: null }), NOW)).toBe("connected");
  });

  it("counts a connection with an unreadable end date as connected", () => {
    expect(resolveBankConnectionState(status({ consentValidUntil: "whenever" }), NOW)).toBe(
      "connected",
    );
  });
});
