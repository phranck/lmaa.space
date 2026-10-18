import { describe, expect, it, vi } from "vitest";

import { backfillShopSlugs } from "./shop-slug-backfill.js";

describe("backfillShopSlugs", () => {
  it("assigns deterministic canonical slugs only to shops that lack one", async () => {
    const inserts: Array<[string, number]> = [];
    const sql = vi.fn((parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("?");
      if (query.includes("SELECT slug, shop_id")) {
        return Promise.resolve([{ slug: "fair-shop", shopId: 1 }]);
      }
      if (query.includes("SELECT s.id, s.name")) {
        return Promise.resolve([
          { id: 2, name: "Fair Shop" },
          { id: 3, name: "MA-Oldtimer.de" },
        ]);
      }
      if (query.includes("INSERT INTO shop_slugs")) {
        inserts.push([values[0] as string, values[1] as number]);
        return Promise.resolve([]);
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(backfillShopSlugs(sql as never)).resolves.toBe(2);
    expect(inserts).toEqual([
      ["fair-shop-2", 2],
      ["ma-oldtimer", 3],
    ]);
  });
});
