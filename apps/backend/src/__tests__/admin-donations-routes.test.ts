import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const repositoryMocks = vi.hoisted(() => ({
  listDonations: vi.fn(),
  listDonationPeriods: vi.fn(),
  listDonationProviders: vi.fn(),
  sumDonations: vi.fn(),
  getDonation: vi.fn(),
  insertDonation: vi.fn(),
  updateDonation: vi.fn(),
  deleteDonation: vi.fn(),
}));

vi.mock("../repositories/donations.js", () => repositoryMocks);

import { donationRoutes } from "../routes/admin/donations.js";

/** A payment as the routes hand it back, with everything the contract requires. */
const sampleDonation = {
  id: "6c4d6a7e-1f2b-4c3d-8e9f-0a1b2c3d4e5f",
  firstName: "Alex",
  lastName: "Bauer",
  socialMedia: [],
  published: false,
  amountCents: 2_500,
  receivedAt: "2026-08-20",
  provider: "sepa",
  note: "",
  sponsorId: null,
  createdAt: "2026-08-20T09:00:00.000Z",
};

function makeApp() {
  const app = new Hono();
  app.route("/", donationRoutes);
  return app;
}

describe("donation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.listDonations.mockResolvedValue([sampleDonation]);
    repositoryMocks.sumDonations.mockResolvedValue({ cents: 2_500, count: 1 });
    repositoryMocks.listDonationPeriods.mockResolvedValue([]);
    repositoryMocks.listDonationProviders.mockResolvedValue([]);
  });

  it("passes the requested window to both the list and its sum", async () => {
    const response = await makeApp().request("/donations?from=2026-08-01&to=2026-08-31");

    expect(response.status).toBe(200);
    // The same window on both, so the total under the table cannot describe a
    // different period from the rows above it.
    const window = { from: "2026-08-01", to: "2026-08-31" };
    expect(repositoryMocks.listDonations).toHaveBeenCalledWith(window);
    expect(repositoryMocks.sumDonations).toHaveBeenCalledWith(window);

    const body = await response.json();
    expect(body.data).toMatchObject({ rangeCents: 2_500, rangeCount: 1 });
    expect(body.data.donations).toHaveLength(1);
  });

  it("leaves the window open when no days are given", async () => {
    await makeApp().request("/donations");

    expect(repositoryMocks.listDonations).toHaveBeenCalledWith({});
    expect(repositoryMocks.sumDonations).toHaveBeenCalledWith({});
  });

  it("refuses a day that is not a day", async () => {
    const response = await makeApp().request("/donations?from=August");

    expect(response.status).toBe(400);
    expect(repositoryMocks.listDonations).not.toHaveBeenCalled();
  });

  describe("the grouped ledger", () => {
    it("groups the same window the list would have taken", async () => {
      repositoryMocks.listDonationPeriods.mockResolvedValue([
        { start: "2026-08-20", sponsorCents: 0, donationCents: 2_500, count: 1 },
      ]);

      const response = await makeApp().request(
        "/donations/breakdown?from=2026-08-01&to=2026-08-31",
      );

      expect(response.status).toBe(200);
      const window = { from: "2026-08-01", to: "2026-08-31" };
      expect(repositoryMocks.listDonationPeriods).toHaveBeenCalledWith(window, "day");
      expect(repositoryMocks.listDonationProviders).toHaveBeenCalledWith(window);

      const body = await response.json();
      expect(body.data).toMatchObject({ bucket: "day", totalCents: 2_500, totalCount: 1 });
      expect(body.data.periods).toHaveLength(31);
    });

    it("refuses a day that is not a day", async () => {
      const response = await makeApp().request("/donations/breakdown?from=Michaelmas");

      expect(response.status).toBe(400);
      expect(repositoryMocks.listDonationPeriods).not.toHaveBeenCalled();
    });

    it("takes no period size from the caller, so the answer stays bounded", async () => {
      // A year asked for in daily bars would be 365 entries. The window decides,
      // and a parameter naming a size is simply not read.
      await makeApp().request("/donations/breakdown?from=2025-09-02&to=2026-09-02&bucket=day");

      expect(repositoryMocks.listDonationPeriods).toHaveBeenCalledWith(
        { from: "2025-09-02", to: "2026-09-02" },
        "month",
      );
    });

    it("is not swallowed by the route that reads one payment", async () => {
      await makeApp().request("/donations/breakdown");

      expect(repositoryMocks.getDonation).not.toHaveBeenCalled();
      expect(repositoryMocks.listDonationPeriods).toHaveBeenCalled();
    });
  });

  it("stores a payment and defaults the consent to withheld", async () => {
    repositoryMocks.insertDonation.mockResolvedValue(sampleDonation);

    const response = await makeApp().request("/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Alex",
        amountCents: 2_500,
        receivedAt: "2026-08-20",
        provider: "sepa",
      }),
    });

    expect(response.status).toBe(200);
    expect(repositoryMocks.insertDonation).toHaveBeenCalledWith(
      expect.objectContaining({ published: false, sponsorId: null, lastName: "", note: "" }),
    );
  });

  it("refuses a route it does not know", async () => {
    const response = await makeApp().request("/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Alex",
        amountCents: 2_500,
        receivedAt: "2026-08-20",
        provider: "western-union",
      }),
    });

    expect(response.status).toBe(400);
    expect(repositoryMocks.insertDonation).not.toHaveBeenCalled();
  });

  it("answers 404 for a payment that is not there", async () => {
    repositoryMocks.deleteDonation.mockResolvedValue(false);

    const response = await makeApp().request(`/donations/${sampleDonation.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
  });
});
