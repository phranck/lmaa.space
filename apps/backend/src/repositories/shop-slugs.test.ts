import { describe, expect, it } from "vitest";

import { planCanonicalShopSlug } from "./shop-slugs.js";

describe("planCanonicalShopSlug", () => {
  it("keeps the old canonical row as an alias when a shop is renamed", () => {
    expect(
      planCanonicalShopSlug([{ slug: "old-name", shopId: 1, canonical: true }], 1, "New Name"),
    ).toEqual({ slug: "new-name", change: "insert" });
  });

  it("promotes an owned historical alias when the shop takes that name again", () => {
    expect(
      planCanonicalShopSlug(
        [
          { slug: "old-name", shopId: 1, canonical: false },
          { slug: "current-name", shopId: 1, canonical: true },
        ],
        1,
        "Old Name",
      ),
    ).toEqual({ slug: "old-name", change: "promote" });
  });

  it("does nothing when the existing canonical slug still matches", () => {
    expect(
      planCanonicalShopSlug([{ slug: "same-name", shopId: 1, canonical: true }], 1, "Same Name"),
    ).toEqual({ slug: "same-name", change: "none" });
  });

  it("uses an unsuffixed readable slug when it only resembles a hypothetical token", () => {
    expect(planCanonicalShopSlug([], 1, "KaosKvlt")).toEqual({
      slug: "kaoskvlt",
      change: "insert",
    });
  });

  it("reserves the legacy tokens of shops that actually exist", () => {
    expect(
      planCanonicalShopSlug([{ slug: "other-shop", shopId: 564, canonical: true }], 1, "nrqimu18"),
    ).toEqual({ slug: "nrqimu18-2", change: "insert" });
  });
});
