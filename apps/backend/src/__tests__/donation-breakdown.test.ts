import { beforeEach, describe, expect, it, vi } from "vitest";

const listDonationPeriods = vi.fn();
const listDonationProviders = vi.fn();

vi.mock("../repositories/donations.js", () => ({
  listDonationPeriods,
  listDonationProviders,
  sumDonations: vi.fn(),
}));

const { getDonationBreakdown } = await import("../services/donations.js");

/** One grouped row, with the fields a caller does not care about filled in. */
function period(start: string, sponsorCents: number, donationCents: number, count = 1) {
  return { start, sponsorCents, donationCents, count };
}

describe("getDonationBreakdown", () => {
  beforeEach(() => {
    listDonationPeriods.mockReset();
    listDonationProviders.mockReset();
    listDonationPeriods.mockResolvedValue([]);
    listDonationProviders.mockResolvedValue([]);
  });

  describe("the period size follows the window rather than the request", () => {
    it("draws a short window by day", async () => {
      const result = await getDonationBreakdown(
        { from: "2026-08-01", to: "2026-08-31" },
        "2026-09-02",
      );

      expect(result.bucket).toBe("day");
      expect(listDonationPeriods).toHaveBeenCalledWith(
        { from: "2026-08-01", to: "2026-08-31" },
        "day",
      );
    });

    it("draws a year by month, so the answer cannot run to 365 entries", async () => {
      const result = await getDonationBreakdown(
        { from: "2025-09-02", to: "2026-09-02" },
        "2026-09-02",
      );

      expect(result.bucket).toBe("month");
    });

    it("draws an open window by month, because how far it reaches is not known", async () => {
      expect((await getDonationBreakdown({}, "2026-09-02")).bucket).toBe("month");
      expect((await getDonationBreakdown({ from: "2026-01-01" }, "2026-09-02")).bucket).toBe(
        "month",
      );
    });
  });

  describe("every period in the window is present", () => {
    it("fills a month nothing came in over with zero rather than leaving it out", async () => {
      listDonationPeriods.mockResolvedValue([
        period("2026-01-01", 0, 5_000),
        period("2026-04-01", 12_000, 0),
      ]);

      const result = await getDonationBreakdown(
        { from: "2026-01-15", to: "2026-04-20" },
        "2026-09-02",
      );

      expect(result.periods.map((entry) => entry.start)).toEqual([
        "2026-01-01",
        "2026-02-01",
        "2026-03-01",
        "2026-04-01",
      ]);
      expect(result.periods[1]).toEqual(period("2026-02-01", 0, 0, 0));
      expect(result.periods[2]).toEqual(period("2026-03-01", 0, 0, 0));
    });

    it("fills an empty day inside a daily window", async () => {
      listDonationPeriods.mockResolvedValue([period("2026-08-01", 0, 2_500)]);

      const result = await getDonationBreakdown(
        { from: "2026-08-01", to: "2026-08-04" },
        "2026-09-02",
      );

      expect(result.periods.map((entry) => entry.start)).toEqual([
        "2026-08-01",
        "2026-08-02",
        "2026-08-03",
        "2026-08-04",
      ]);
    });

    it("crosses a year boundary without repeating a month", async () => {
      const result = await getDonationBreakdown(
        { from: "2025-11-04", to: "2026-02-09" },
        "2026-09-02",
      );

      expect(result.periods.map((entry) => entry.start)).toEqual([
        "2025-11-01",
        "2025-12-01",
        "2026-01-01",
        "2026-02-01",
      ]);
    });

    it("reaches as far as the ledger does where an end was left open", async () => {
      listDonationPeriods.mockResolvedValue([
        period("2026-05-01", 0, 3_000),
        period("2026-07-01", 0, 4_000),
      ]);

      const result = await getDonationBreakdown({}, "2026-09-02");

      expect(result.periods.map((entry) => entry.start)).toEqual([
        "2026-05-01",
        "2026-06-01",
        "2026-07-01",
      ]);
    });

    it("gives no periods at all for an empty ledger and an open window", async () => {
      expect((await getDonationBreakdown({}, "2026-09-02")).periods).toEqual([]);
    });

    it("gives no periods for a window that runs backwards", async () => {
      const result = await getDonationBreakdown(
        { from: "2026-08-31", to: "2026-08-01" },
        "2026-09-02",
      );

      expect(result.periods).toEqual([]);
    });
  });

  describe("a sponsorship payment and a free donation stay apart", () => {
    it("keeps the two amounts separate within one period", async () => {
      listDonationPeriods.mockResolvedValue([period("2026-03-01", 12_000, 2_500, 3)]);

      const result = await getDonationBreakdown(
        { from: "2026-03-01", to: "2026-03-31" },
        "2026-09-02",
      );

      expect(result.periods[0]).toMatchObject({ sponsorCents: 12_000, donationCents: 2_500 });
      expect(result.sponsorCents).toBe(12_000);
      expect(result.totalCents).toBe(14_500);
    });
  });

  describe("the totals agree with the bars they stand above", () => {
    it("adds the periods up to the window total", async () => {
      listDonationPeriods.mockResolvedValue([
        period("2026-01-01", 12_000, 0, 1),
        period("2026-02-01", 0, 2_500, 1),
        period("2026-03-01", 6_000, 1_500, 2),
      ]);

      const result = await getDonationBreakdown(
        { from: "2026-01-01", to: "2026-03-31" },
        "2026-09-02",
      );

      const drawn = result.periods.reduce(
        (sum, entry) => sum + entry.sponsorCents + entry.donationCents,
        0,
      );
      expect(drawn).toBe(result.totalCents);
      expect(result.totalCents).toBe(22_000);
      expect(result.totalCount).toBe(4);
      expect(result.sponsorCents).toBe(18_000);
    });

    it("gives zero rather than nothing for an empty window", async () => {
      const result = await getDonationBreakdown(
        { from: "2026-01-01", to: "2026-01-31" },
        "2026-09-02",
      );

      expect(result).toMatchObject({ totalCents: 0, totalCount: 0, sponsorCents: 0 });
    });
  });

  describe("payment routes", () => {
    it("hands the routes back largest first", async () => {
      listDonationProviders.mockResolvedValue([
        { provider: "paypal", cents: 9_000, count: 4 },
        { provider: "sepa", cents: 3_000, count: 1 },
      ]);

      const result = await getDonationBreakdown({}, "2026-09-02");

      expect(result.providers).toEqual([
        { provider: "paypal", cents: 9_000, count: 4 },
        { provider: "sepa", cents: 3_000, count: 1 },
      ]);
    });

    it("files a route the contract no longer lists under `other`", async () => {
      listDonationProviders.mockResolvedValue([{ provider: "carrierpigeon", cents: 700, count: 1 }]);

      const result = await getDonationBreakdown({}, "2026-09-02");

      expect(result.providers).toEqual([{ provider: "other", cents: 700, count: 1 }]);
    });

    it("draws `other` once when two unknown routes land in it", async () => {
      listDonationProviders.mockResolvedValue([
        { provider: "carrierpigeon", cents: 700, count: 1 },
        { provider: "other", cents: 300, count: 2 },
        { provider: "messagebottle", cents: 100, count: 1 },
      ]);

      const result = await getDonationBreakdown({}, "2026-09-02");

      expect(result.providers).toEqual([{ provider: "other", cents: 1_100, count: 4 }]);
    });

    it("asks for the routes over the same window as the periods", async () => {
      await getDonationBreakdown({ from: "2026-08-01", to: "2026-08-31" }, "2026-09-02");

      expect(listDonationProviders).toHaveBeenCalledWith({
        from: "2026-08-01",
        to: "2026-08-31",
      });
    });
  });
});
