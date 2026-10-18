import { describe, expect, it } from "vitest";

import { canonicalShopRedirectPath, shopDetailPath, shopIdDetailPath } from "./shop-detail-path";

describe("shop detail paths", () => {
  it("builds the canonical path from the persisted slug", () => {
    expect(shopDetailPath("ma-oldtimer")).toBe("/shop/ma-oldtimer");
  });

  it("builds an explicitly namespaced path for an identifier link", () => {
    expect(shopIdDetailPath(564)).toBe("/shop/id/nrqimu18");
  });

  it("redirects a token or historical slug while preserving return context", () => {
    expect(canonicalShopRedirectPath("nrqimu18", "ma-oldtimer", "?from=search&q=oldtimer")).toBe(
      "/shop/ma-oldtimer?from=search&q=oldtimer",
    );
    expect(canonicalShopRedirectPath("ma-oldtimer", "ma-oldtimer", "?from=likes")).toBeNull();
  });
});
