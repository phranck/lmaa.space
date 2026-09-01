import { beforeEach, describe, expect, it, vi } from "vitest";

const sumDonations = vi.fn();

vi.mock("../repositories/donations.js", () => ({ sumDonations }));

const { getDonationTotals } = await import("../services/donations.js");

describe("getDonationTotals", () => {
  beforeEach(() => {
    sumDonations.mockReset();
    sumDonations.mockResolvedValue({ cents: 0, count: 0 });
  });

  it("asks for both windows against the given day, not against the clock", async () => {
    await getDonationTotals("2026-09-01");

    expect(sumDonations).toHaveBeenCalledWith({ from: "2026-08-03", to: "2026-09-01" });
    expect(sumDonations).toHaveBeenCalledWith({ from: "2025-09-02", to: "2026-09-01" });
  });

  it("reports each window separately rather than adding them together", async () => {
    sumDonations
      .mockResolvedValueOnce({ cents: 2_500, count: 1 })
      .mockResolvedValueOnce({ cents: 18_000, count: 7 });

    expect(await getDonationTotals("2026-09-01")).toEqual({
      monthCents: 2_500,
      yearCents: 18_000,
      yearCount: 7,
    });
  });

  it("gives zero for an empty ledger rather than leaving the figure absent", async () => {
    expect(await getDonationTotals("2026-09-01")).toEqual({
      monthCents: 0,
      yearCents: 0,
      yearCount: 0,
    });
  });
});
