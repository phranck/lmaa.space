import { describe, expect, it } from "vitest";

import { shopBodySchema, shopJsonSchema, submissionEditSchema } from "@lmaa/contracts";

const canonicalMethods = ["paypal", "visa", "mastercard"];

describe("payment method contracts", () => {
  it("keeps canonical payment methods in admin shop and submission payloads", () => {
    const shop = shopBodySchema.parse({
      name: "Payments",
      url: "https://payments.example",
      paymentMethods: canonicalMethods,
      socialMedia: {},
    });
    const submission = submissionEditSchema.parse({
      shopName: "Payments",
      shopUrl: "https://payments.example",
      region: [],
      categoryIds: [],
      paymentMethods: canonicalMethods,
      socialMedia: {},
    });

    expect(shop.paymentMethods).toEqual(canonicalMethods);
    expect(submission.paymentMethods).toEqual(canonicalMethods);
  });

  it("accepts unnormalized payment strings only in shop-check JSON", () => {
    expect(
      shopJsonSchema.parse({ paymentMethods: ["PayPal", "SEPA Direct Debit"] }).paymentMethods,
    ).toEqual(["PayPal", "SEPA Direct Debit"]);

    expect(() =>
      shopBodySchema.parse({
        name: "Payments",
        url: "https://payments.example",
        paymentMethods: ["bitcoin"],
        socialMedia: {},
      }),
    ).toThrow();
  });
});
