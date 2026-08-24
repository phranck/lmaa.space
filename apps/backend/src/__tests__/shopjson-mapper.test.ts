import { describe, expect, it } from "vitest";

import { mapShopJsonToShopData } from "../lib/shopjson-mapper.js";

const categoryMap = new Map([
  ["mode", 1],
  ["kosmetik", 2],
  ["lebensmittel", 3],
]);

describe("mapShopJsonToShopData", () => {
  it("maps basic fields", () => {
    const result = mapShopJsonToShopData(
      {
        name: "Fair Shop",
        url: "https://fair-shop.de",
        description: "A fair trade shop",
      },
      categoryMap,
    );

    expect(result.name).toBe("Fair Shop");
    expect(result.url).toBe("https://fair-shop.de");
    expect(result.description).toBe("A fair trade shop");
  });

  it("defaults empty strings for missing fields", () => {
    const result = mapShopJsonToShopData({}, categoryMap);

    expect(result.name).toBe("");
    expect(result.url).toBe("");
    expect(result.description).toBe("");
  });

  it("maps category names to IDs (case-insensitive)", () => {
    const result = mapShopJsonToShopData(
      { categories: ["Mode", "KOSMETIK", "Unknown"] },
      categoryMap,
    );

    expect(result.categoryIds).toEqual([1, 2]);
  });

  it("deduplicates category IDs", () => {
    const result = mapShopJsonToShopData({ categories: ["Mode", "mode"] }, categoryMap);

    expect(result.categoryIds).toEqual([1]);
  });

  it("maps shipping regions and filters invalid ones", () => {
    const result = mapShopJsonToShopData(
      { shippingRegions: ["de", "AT", "INVALID", "EU"] },
      categoryMap,
    );

    expect(result.region).toEqual(["DE", "AT", "EU"]);
  });

  it("deduplicates regions", () => {
    const result = mapShopJsonToShopData({ shippingRegions: ["DE", "de"] }, categoryMap);

    expect(result.region).toEqual(["DE"]);
  });

  it("maps social media", () => {
    const result = mapShopJsonToShopData(
      {
        socialMedia: {
          instagram: "https://instagram.com/shop",
          facebook: "",
          twitter: null,
        },
      },
      categoryMap,
    );

    expect(result.socialMedia).toEqual([
      { platform: "instagram", url: "https://instagram.com/shop" },
    ]);
  });

  it("normalizes and deduplicates imported payment methods", () => {
    const result = mapShopJsonToShopData(
      {
        paymentMethods: [
          "PayPal",
          "credit-card",
          "Visa",
          "MasterCard",
          "amex",
          "SEPA Direct Debit",
          "Visa",
          "bitcoin",
        ],
      },
      categoryMap,
    );

    expect(result.paymentMethods).toEqual([
      "paypal",
      "visa",
      "mastercard",
      "american_express",
      "sepa",
    ]);
  });

  it("omits payment methods when older shop-check JSON has no payment field", () => {
    const result = mapShopJsonToShopData({}, categoryMap);

    expect(result.paymentMethods).toBeUndefined();
  });

  it("maps headquarters from hq and geo", () => {
    const result = mapShopJsonToShopData(
      {
        headquarters: {
          street: "Musterstr. 1",
          postalCode: "10115",
          city: "Berlin",
          countryCode: "de",
        },
        geo: { latitude: 52.52, longitude: 13.405 },
      },
      categoryMap,
    );

    expect(result.headquarters).toEqual({
      street: "Musterstr. 1",
      postalCode: "10115",
      city: "Berlin",
      state: undefined,
      countryCode: "DE",
      latitude: 52.52,
      longitude: 13.405,
    });
  });

  it("maps contactEmail", () => {
    const result = mapShopJsonToShopData({ contactEmail: "info@shop.de" }, categoryMap);

    expect(result.contactEmail).toBe("info@shop.de");
  });

  it("maps shop check notes for search metadata", () => {
    const result = mapShopJsonToShopData(
      {
        notes: {
          focus: ["Coffee", "Coffee", "Roastery"],
          brandsOrProducts: ["Hario", "Comandante", ""],
          companyPresentation: "Small direct trade roaster",
        },
      },
      categoryMap,
    );

    expect(result.shopCheckNotes).toEqual({
      focus: ["Coffee", "Roastery"],
      brandsOrProducts: ["Hario", "Comandante"],
      companyPresentation: "Small direct trade roaster",
    });
  });

  it("omits shop check notes when the field is absent", () => {
    const result = mapShopJsonToShopData({}, categoryMap);

    expect(result.shopCheckNotes).toBeUndefined();
  });

  it("omits headquarters when neither hq nor geo provided", () => {
    const result = mapShopJsonToShopData({}, categoryMap);
    expect(result.headquarters).toBeUndefined();
  });
});
