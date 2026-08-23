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
    announced: {
      firstName: "Kim",
      lastName: "Lorenz",
      link: "https://github.com/kim",
      claim: "Weil es sonst niemand macht.",
      published: false,
    },
    ...overrides,
  });
}

describe("parseIssuedSponsorship", () => {
  it("reads back what was stored", () => {
    expect(parseIssuedSponsorship(stored(), NOW)).toEqual({
      reference: "RF18SPON26001",
      referenceFormatted: "RF18 SPON 2600 1",
      issuedAt: NOW,
      announced: {
        firstName: "Kim",
        lastName: "Lorenz",
        link: "https://github.com/kim",
        claim: "Weil es sonst niemand macht.",
        published: false,
      },
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

  it("gives an empty announcement for an entry stored before it was kept", () => {
    // An older entry still has a reference worth showing; only the form behind
    // it starts blank.
    const entry = parseIssuedSponsorship(stored({ announced: undefined }), NOW);

    expect(entry?.reference).toBe("RF18SPON26001");
    expect(entry?.announced).toEqual({
      firstName: "",
      lastName: "",
      link: "",
      claim: "",
      published: true,
    });
  });

  it("drops an entry the server has removed by now", () => {
    const issuedAt = NOW - PENDING_SPONSORSHIP_DAYS * DAY_MS;
    expect(parseIssuedSponsorship(stored({ issuedAt }), NOW)).toBeNull();
  });
});
