import { describe, expect, it, vi } from "vitest";

import { assignCanonicalShopSlug, planCanonicalShopSlug } from "./shop-slugs.js";

describe("planCanonicalShopSlug", () => {
  it("replaces the canonical slug when a shop is renamed", () => {
    expect(planCanonicalShopSlug([{ slug: "old-name", shopId: 1 }], 1, "New Name")).toEqual({
      slug: "new-name",
      change: "update",
    });
  });

  it("does nothing when the existing canonical slug still matches", () => {
    expect(planCanonicalShopSlug([{ slug: "same-name", shopId: 1 }], 1, "Same Name")).toEqual({
      slug: "same-name",
      change: "none",
    });
  });

  it("uses an unsuffixed readable slug when it only resembles a hypothetical token", () => {
    expect(planCanonicalShopSlug([], 1, "KaosKvlt")).toEqual({
      slug: "kaoskvlt",
      change: "insert",
    });
  });

  it("reserves the legacy tokens of shops that actually exist", () => {
    expect(planCanonicalShopSlug([{ slug: "other-shop", shopId: 564 }], 1, "nrqimu18")).toEqual({
      slug: "nrqimu18-2",
      change: "insert",
    });
  });

  it("updates the sole canonical row instead of retaining the old slug", async () => {
    const set = vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) }));
    const tx = {
      execute: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => ({
        from: vi.fn(() => Promise.resolve([{ slug: "old-name", shopId: 1 }])),
      })),
      update: vi.fn(() => ({ set })),
      insert: vi.fn(),
    };

    await expect(assignCanonicalShopSlug(tx as never, 1, "New Name")).resolves.toBe("new-name");

    expect(set).toHaveBeenCalledWith({ slug: "new-name" });
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
