import { beforeEach, describe, expect, it, vi } from "vitest";

const readMocks = vi.hoisted(() => ({ getReadTimesInWindow: vi.fn() }));

vi.mock("../repositories/bank-reads.js", () => readMocks);

import type { BankConnectionRow } from "../db/schema.js";
import {
  BACKGROUND_INTERVAL_MS,
  nextBackgroundReadAt,
  READ_WINDOW_HOURS,
  READ_WINDOW_MS,
} from "../services/bank-read-schedule.js";

const NOW = new Date("2026-09-12T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

/** A connection in force, which each case then bends. */
function connection(overrides: Partial<BankConnectionRow> = {}): BankConnectionRow {
  return {
    id: "2f1d0a1e-6f3f-4c5b-9c7a-0d1e2f3a4b5c",
    sessionId: "session-that-never-leaves-the-backend",
    accountUid: "account-1",
    aspspName: "Erste Bank",
    aspspCountry: "AT",
    consentValidUntil: new Date("2027-03-02T00:00:00.000Z"),
    consentNoticeStage: null,
    revokedAt: null,
    createdAt: new Date("2026-09-03T10:00:00.000Z"),
    ...overrides,
  };
}

/** Reads at the given ages in hours, newest first, as the repository hands them back. */
function readsAgedHours(...ages: number[]): Date[] {
  return ages.map((age) => new Date(NOW.getTime() - age * HOUR_MS));
}

describe("when the account is read next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readMocks.getReadTimesInWindow.mockResolvedValue([]);
  });

  it("names no time whilst nothing is connected", async () => {
    expect(await nextBackgroundReadAt(null, NOW)).toBeNull();
    expect(readMocks.getReadTimesInWindow).not.toHaveBeenCalled();
  });

  it("names no time once the consent has lapsed", async () => {
    const lapsed = connection({ consentValidUntil: new Date(NOW.getTime() - HOUR_MS) });

    expect(await nextBackgroundReadAt(lapsed, NOW)).toBeNull();
  });

  it("names no time at the very moment the consent lapses", async () => {
    // The run itself stops on the same boundary, so the card must not promise a
    // read that will be refused.
    const lapsing = connection({ consentValidUntil: NOW });

    expect(await nextBackgroundReadAt(lapsing, NOW)).toBeNull();
  });

  it("counts a connection without an end date as one that keeps reading", async () => {
    const open = connection({ consentValidUntil: null });

    expect(await nextBackgroundReadAt(open, NOW)).toEqual(NOW);
  });

  it("is due now whilst the window holds nothing", async () => {
    expect(await nextBackgroundReadAt(connection(), NOW)).toEqual(NOW);
  });

  it("waits out the interval after the last read", async () => {
    readMocks.getReadTimesInWindow.mockResolvedValue(readsAgedHours(2));

    expect(await nextBackgroundReadAt(connection(), NOW)).toEqual(
      new Date(NOW.getTime() - 2 * HOUR_MS + BACKGROUND_INTERVAL_MS),
    );
  });

  it("is due now once the interval has passed and the window has room", async () => {
    // Seven hours ago is past the interval and still inside the window, so the
    // read is overdue rather than scheduled.
    readMocks.getReadTimesInWindow.mockResolvedValue(readsAgedHours(7));

    expect(await nextBackgroundReadAt(connection(), NOW)).toEqual(NOW);
  });

  it("waits for the oldest read to leave a full window", async () => {
    // Four reads close together, which is what a run of deployments produces:
    // the interval would let one through in five hours, and the budget will
    // not until the oldest of them is twenty-four hours old.
    readMocks.getReadTimesInWindow.mockResolvedValue(readsAgedHours(1, 2, 3, 4));

    expect(await nextBackgroundReadAt(connection(), NOW)).toEqual(
      new Date(NOW.getTime() - 4 * HOUR_MS + READ_WINDOW_MS),
    );
  });

  it("still waits out the interval where the full window would allow one sooner", async () => {
    readMocks.getReadTimesInWindow.mockResolvedValue(readsAgedHours(1, 7, 13, 23));

    expect(await nextBackgroundReadAt(connection(), NOW)).toEqual(
      new Date(NOW.getTime() - HOUR_MS + BACKGROUND_INTERVAL_MS),
    );
  });

  it("asks for the background reads over the window the cap is measured on", async () => {
    await nextBackgroundReadAt(connection(), NOW);

    expect(readMocks.getReadTimesInWindow).toHaveBeenCalledWith("background", READ_WINDOW_HOURS);
  });

  it("never names a time that has already passed", async () => {
    // Whatever the window holds, a figure in the past would print as a minute
    // the operator has watched go by, and the card takes this for granted when
    // it turns anything not in the future into "due now".
    for (const reads of [
      readsAgedHours(),
      readsAgedHours(23),
      readsAgedHours(1, 2, 3, 4),
      readsAgedHours(1, 7, 13, 19),
    ]) {
      readMocks.getReadTimesInWindow.mockResolvedValue(reads);
      const next = await nextBackgroundReadAt(connection(), NOW);
      expect(next?.getTime()).toBeGreaterThanOrEqual(NOW.getTime());
    }
  });
});
