import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({ db: {} }));

const SUBMISSION = {
  id: 4711,
  shopName: "Card Network Shop",
  shopUrl: "https://payments.example",
  region: ["EU"],
  pickup: "",
  shipping: "EU",
  description: "Description",
  ogImage: null,
  logoBackgroundColor: null,
  contactEmail: "hello@payments.example",
  shopCheckNotes: null,
  socialMedia: {},
  paymentMethods: ["visa", "mastercard"],
};

async function loadBuildApprovedShopData() {
  const repository = (await import("../repositories/admin-submissions.js")) as Record<
    string,
    unknown
  >;

  return repository.buildApprovedShopData as
    | ((submission: Record<string, unknown>) => Record<string, unknown>)
    | undefined;
}

describe("admin submissions repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("copies payment methods into the shop created from an approved submission", async () => {
    const buildApprovedShopData = await loadBuildApprovedShopData();

    expect(buildApprovedShopData).toBeTypeOf("function");
    expect(buildApprovedShopData?.(SUBMISSION)).toMatchObject({
      paymentMethods: ["visa", "mastercard"],
    });
  });

  it("records which submission the shop was admitted from", async () => {
    const buildApprovedShopData = await loadBuildApprovedShopData();

    expect(buildApprovedShopData?.(SUBMISSION)).toMatchObject({ submissionId: 4711 });
  });
});
