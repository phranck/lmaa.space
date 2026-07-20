import { describe, expect, it } from "vitest";

import * as shared from "../index.js";

type PaymentMethodModule = {
  PAYMENT_METHOD_KEYS?: readonly string[];
  normalizePaymentMethods?: (value: unknown) => string[];
};

const paymentMethods = shared as typeof shared & PaymentMethodModule;

describe("payment methods", () => {
  it("normalizes aliases, removes unknown values, and deduplicates card networks", () => {
    expect(paymentMethods.PAYMENT_METHOD_KEYS).toEqual([
      "paypal",
      "credit_card",
      "stripe",
      "sepa",
      "bank_transfer",
      "invoice",
      "klarna",
      "apple_pay",
      "google_pay",
      "amazon_pay",
      "visa",
      "mastercard",
      "american_express",
    ]);

    expect(paymentMethods.normalizePaymentMethods).toBeTypeOf("function");
    expect(
      paymentMethods.normalizePaymentMethods?.([
        "PayPal",
        "credit-card",
        "MasterCard",
        "amex",
        "SEPA Direct Debit",
        "bank transfer",
        "MasterCard",
        "bitcoin",
      ]),
    ).toEqual(["paypal", "mastercard", "american_express", "sepa", "bank_transfer"]);
  });

  it("keeps generic credit card acceptance when no card network is known", () => {
    expect(paymentMethods.normalizePaymentMethods?.(["credit card", "Stripe"])).toEqual([
      "credit_card",
      "stripe",
    ]);
  });

  it("returns an empty list for non-array input", () => {
    expect(paymentMethods.normalizePaymentMethods?.("paypal")).toEqual([]);
  });
});
