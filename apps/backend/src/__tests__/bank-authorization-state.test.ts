import { describe, expect, it } from "vitest";

import { matchAuthorizationState } from "../lib/bank-authorization-state.js";

/** A value of the shape and length the site actually issues. */
const ISSUED = "a".repeat(64);
const NOW = new Date("2026-09-03T12:00:00.000Z");

function candidate(state: string, expiresAt: Date) {
  return { state, expiresAt };
}

describe("matching a returning authorization", () => {
  it("recognises the value it issued", () => {
    const stored = candidate(ISSUED, new Date("2026-09-03T12:10:00.000Z"));

    expect(matchAuthorizationState([stored], ISSUED, NOW)).toBe(stored);
  });

  it("refuses a value it never issued", () => {
    const stored = candidate(ISSUED, new Date("2026-09-03T12:10:00.000Z"));

    expect(matchAuthorizationState([stored], "b".repeat(64), NOW)).toBeNull();
  });

  it("refuses a value whose authorization has run out", () => {
    const stored = candidate(ISSUED, new Date("2026-09-03T11:59:59.000Z"));

    expect(matchAuthorizationState([stored], ISSUED, NOW)).toBeNull();
  });

  it("refuses a value at the very moment it runs out", () => {
    // The window is open whilst the moment is still ahead, so the moment itself
    // is already past it.
    const stored = candidate(ISSUED, NOW);

    expect(matchAuthorizationState([stored], ISSUED, NOW)).toBeNull();
  });

  it("refuses everything when nothing is in flight", () => {
    expect(matchAuthorizationState([], ISSUED, NOW)).toBeNull();
  });

  it("picks the one that matches out of several in flight", () => {
    const other = candidate("c".repeat(64), new Date("2026-09-03T12:10:00.000Z"));
    const wanted = candidate(ISSUED, new Date("2026-09-03T12:05:00.000Z"));

    expect(matchAuthorizationState([other, wanted], ISSUED, NOW)).toBe(wanted);
  });

  it("refuses a value that is only a prefix of the one it issued", () => {
    const stored = candidate(ISSUED, new Date("2026-09-03T12:10:00.000Z"));

    expect(matchAuthorizationState([stored], ISSUED.slice(0, 32), NOW)).toBeNull();
  });
});
