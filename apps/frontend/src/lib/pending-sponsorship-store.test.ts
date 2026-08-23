import { describe, expect, it } from "vitest";

import { PENDING_SPONSORSHIP_DAYS } from "@lmaa/contracts";

import { parseIssuedSponsorship } from "./pending-sponsorship-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 23);

/** A stored entry, with anything a single test cares about on top. */
function stored(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    reference: "RF18SPON26001",
    referenceFormatted: "RF18 SPON 2600 1",
    issuedAt: NOW,
    ...overrides,
  });
}

describe("parseIssuedSponsorship", () => {
  it("reads back what was stored", () => {
    expect(parseIssuedSponsorship(stored(), NOW)).toEqual({
      reference: "RF18SPON26001",
      referenceFormatted: "RF18 SPON 2600 1",
      issuedAt: NOW,
    });
  });

  it("gives nothing when nothing was stored", () => {
    expect(parseIssuedSponsorship(null, NOW)).toBeNull();
  });

  it("gives nothing for anything that is not a stored entry", () => {
    for (const raw of ["", "not json", "[]", "null", '"RF18SPON26001"']) {
      expect(parseIssuedSponsorship(raw, NOW)).toBeNull();
    }
  });

  it("gives nothing when a field is missing or empty", () => {
    expect(parseIssuedSponsorship(stored({ reference: "" }), NOW)).toBeNull();
    expect(parseIssuedSponsorship(stored({ referenceFormatted: undefined }), NOW)).toBeNull();
    expect(parseIssuedSponsorship(stored({ issuedAt: "yesterday" }), NOW)).toBeNull();
  });

  it("keeps an entry the server still holds", () => {
    const issuedAt = NOW - (PENDING_SPONSORSHIP_DAYS - 1) * DAY_MS;
    expect(parseIssuedSponsorship(stored({ issuedAt }), NOW)?.issuedAt).toBe(issuedAt);
  });

  it("drops an entry the server has removed by now", () => {
    const issuedAt = NOW - PENDING_SPONSORSHIP_DAYS * DAY_MS;
    expect(parseIssuedSponsorship(stored({ issuedAt }), NOW)).toBeNull();
  });
});
