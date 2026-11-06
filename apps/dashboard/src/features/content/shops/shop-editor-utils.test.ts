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

  it("fills the editor from a review acceptance payload", () => {
    const result = applyShopCheckJsonToForm(
      EMPTY_SHOP_FORM_VALUE,
      {
        name: "Beispielladen",
        url: "https://beispiel.de",
        description: "Regionaler Fachhandel",
        categories: ["Werkzeug"],
        shippingRegions: ["EU"],
        contactEmail: "hallo@beispiel.de",
        socialMedia: [{ platform: "mastodon", url: "https://social.example/@beispiel" }],
        headquarters: { street: "Musterweg 3", city: "Bremen", countryCode: "DE" },
        geo: { latitude: 53.07, longitude: 8.8 },
        notes: { focus: ["Handwerkzeug"] },
      },
      [{ id: 7, name: "Werkzeug" }],
    );

    expect(result).toMatchObject({
      name: "Beispielladen",
      url: "https://beispiel.de",
      description: "Regionaler Fachhandel",
      categoryIds: [7],
      region: ["EU"],
      contactEmail: "hallo@beispiel.de",
      socialMedia: [{ platform: "mastodon", url: "https://social.example/@beispiel" }],
      headquartersStreet: "Musterweg 3",
      headquartersCity: "Bremen",
      headquartersCountryCode: "DE",
      headquartersLatitude: "53.07",
      headquartersLongitude: "8.8",
      shopCheckNotes: { focus: ["Handwerkzeug"] },
    });
  });
});
