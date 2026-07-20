import { describe, expect, it } from "vitest";

import { EMPTY_SHOP_FORM_VALUE } from "@lmaa/ui/shop-edit-form";

import { applyShopCheckJsonToForm } from "./shop-editor-utils";

describe("applyShopCheckJsonToForm", () => {
  it("normalizes payment methods from shop-check JSON", () => {
    const result = applyShopCheckJsonToForm(
      EMPTY_SHOP_FORM_VALUE,
      {
        paymentMethods: [
          "PayPal",
          "credit card",
          "Visa",
          "MasterCard",
          "SEPA Direct Debit",
          "bitcoin",
        ],
      },
      [],
    );

    expect(result?.paymentMethods).toEqual(["paypal", "visa", "mastercard", "sepa"]);
  });
});
