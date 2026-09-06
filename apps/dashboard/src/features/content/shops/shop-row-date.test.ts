import { describe, expect, it } from "vitest";

import { resolveShopRowDate, shopRowDateSortValue } from "./shop-row-date.ts";

const ADMITTED = "2026-03-12T09:00:00.000Z";
const REJECTED = "2026-09-05T14:30:00.000Z";

describe("resolveShopRowDate", () => {
  it("calls a public shop's date its admission", () => {
    const resolved = resolveShopRowDate({
      visibility: "public",
      createdAt: ADMITTED,
      visibilityChangedAt: null,
    });

    expect(resolved).toEqual({
      iso: ADMITTED,
      label: "admitted",
      sortValue: Date.parse(ADMITTED),
    });
  });

  it("prefers the moment the state changed over the moment the row was created", () => {
    const resolved = resolveShopRowDate({
      visibility: "rejected",
      createdAt: ADMITTED,
      visibilityChangedAt: REJECTED,
    });

    expect(resolved?.iso).toBe(REJECTED);
    expect(resolved?.label).toBe("rejected");
  });

  it("names the admission of a shop that was admitted after being rejected", () => {
    const resolved = resolveShopRowDate({
      visibility: "public",
      createdAt: ADMITTED,
      visibilityChangedAt: REJECTED,
    });

    expect(resolved?.iso).toBe(REJECTED);
    expect(resolved?.label).toBe("admitted");
  });

  it("gives each remaining state its own label", () => {
    expect(
      resolveShopRowDate({ visibility: "onhold", createdAt: ADMITTED, visibilityChangedAt: null })
        ?.label,
    ).toBe("onhold");
    expect(
      resolveShopRowDate({ visibility: "deleted", createdAt: ADMITTED, visibilityChangedAt: null })
        ?.label,
    ).toBe("deleted");
  });

  it("answers with nothing where the row carries no date at all", () => {
    expect(
      resolveShopRowDate({ visibility: "public", createdAt: undefined, visibilityChangedAt: null }),
    ).toBeNull();
  });

  it("reads an unusable date as no date rather than as NaN", () => {
    const resolved = resolveShopRowDate({
      visibility: "deleted",
      createdAt: ADMITTED,
      visibilityChangedAt: "not a date",
    });

    expect(resolved?.sortValue).toBe(0);
  });
});

describe("shopRowDateSortValue", () => {
  it("orders an older date below a newer one", () => {
    const older = shopRowDateSortValue({
      visibility: "public",
      createdAt: ADMITTED,
      visibilityChangedAt: null,
    });
    const newer = shopRowDateSortValue({
      visibility: "rejected",
      createdAt: ADMITTED,
      visibilityChangedAt: REJECTED,
    });

    expect(older).toBeLessThan(newer);
  });

  it("gathers a row without a date at one end", () => {
    expect(
      shopRowDateSortValue({
        visibility: "public",
        createdAt: undefined,
        visibilityChangedAt: null,
      }),
    ).toBe(0);
  });
});
