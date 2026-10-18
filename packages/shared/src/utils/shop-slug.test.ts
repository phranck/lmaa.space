import { describe, expect, it } from "vitest";

import { allocateShopSlug, issuedShopTokens, SHOP_SLUG_MAX_LENGTH } from "./shop-slug.js";

describe("allocateShopSlug", () => {
  it("derives a readable slug from the shop name", () => {
    expect(allocateShopSlug("MA-Oldtimer.de", new Set())).toBe("ma-oldtimer");
    expect(allocateShopSlug("Ölmühle Überlingen", new Set())).toBe("oelmuehle-ueberlingen");
  });

  it("uses a stable fallback when no name character survives", () => {
    expect(allocateShopSlug("商店", new Set())).toBe("shop-page");
  });

  it("adds the first available numeric suffix", () => {
    expect(allocateShopSlug("Fair Shop", new Set(["fair-shop", "fair-shop-2"]))).toBe(
      "fair-shop-3",
    );
  });

  it("allows readable names that only resemble hypothetical shop tokens", () => {
    expect(allocateShopSlug("KaosKvlt", new Set())).toBe("kaoskvlt");
  });

  it("avoids tokens that were actually issued for shops", () => {
    const unavailable = issuedShopTokens([564]);

    expect(unavailable).toContain("nrqimu18");
    expect(allocateShopSlug("nrqimu18", unavailable)).toBe("nrqimu18-2");
  });

  it("keeps the complete slug inside the route bound", () => {
    const slug = allocateShopSlug("a".repeat(200), new Set(["a".repeat(SHOP_SLUG_MAX_LENGTH)]));

    expect(slug).toHaveLength(SHOP_SLUG_MAX_LENGTH);
    expect(slug.endsWith("-2")).toBe(true);
  });
});
