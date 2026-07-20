import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({ db: {} }));

describe("admin submissions repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("copies payment methods into the shop created from an approved submission", async () => {
    const repository = (await import("../repositories/admin-submissions.js")) as Record<
      string,
      unknown
    >;
    const buildApprovedShopData = repository.buildApprovedShopData as
      | ((submission: Record<string, unknown>) => Record<string, unknown>)
      | undefined;

    expect(buildApprovedShopData).toBeTypeOf("function");
    expect(
      buildApprovedShopData?.({
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
      }),
    ).toMatchObject({
      paymentMethods: ["visa", "mastercard"],
    });
  });
});
