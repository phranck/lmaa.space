import { describe, expect, it, vi } from "vitest";

import { backfillShopSlugs, repairShopSlugs } from "./shop-slug-backfill.js";

describe("backfillShopSlugs", () => {
  it("assigns deterministic canonical slugs only to shops that lack one", async () => {
    const inserts: Array<[string, number]> = [];
    const sql = vi.fn((parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("?");
      if (query.includes("SELECT slug, shop_id")) {
        return Promise.resolve([
          { slug: "fair-shop", shopId: 1 },
          { slug: "token-owner", shopId: 564 },
        ]);
      }
      if (query.includes("SELECT s.id, s.name")) {
        return Promise.resolve([
          { id: 2, name: "Fair Shop" },
          { id: 3, name: "MA-Oldtimer.de" },
          { id: 4, name: "nrqimu18" },
        ]);
      }
      if (query.includes("INSERT INTO shop_slugs")) {
        inserts.push([values[0] as string, values[1] as number]);
        return Promise.resolve([]);
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(backfillShopSlugs(sql as never)).resolves.toBe(3);
    expect(inserts).toEqual([
      ["fair-shop-2", 2],
      ["ma-oldtimer", 3],
      ["nrqimu18-2", 4],
    ]);
  });

  it("repairs artificial suffixes while retaining their former paths as aliases", async () => {
    const inserts: Array<[string, number]> = [];
    const updates: Array<[string, number]> = [];
    const sql = vi.fn((parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("?");
      if (query.includes('SELECT slug, shop_id AS "shopId", canonical')) {
        return Promise.resolve([
          { slug: "kaoskvlt-2", shopId: 7, canonical: true },
          { slug: "stable-shop", shopId: 8, canonical: true },
        ]);
      }
      if (query.includes("SELECT id, name")) {
        return Promise.resolve([
          { id: 7, name: "KaosKvlt" },
          { id: 8, name: "Stable Shop" },
        ]);
      }
      if (query.includes("INSERT INTO shop_slugs")) {
        inserts.push(values as [string, number]);
        return Promise.resolve([]);
      }
      if (query.includes("UPDATE shop_slugs")) {
        updates.push(values as [string, number]);
        return Promise.resolve([]);
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(repairShopSlugs(sql as never)).resolves.toEqual({ repaired: 1 });
    expect(inserts).toEqual([["kaoskvlt", 7]]);
    expect(updates).toEqual([["kaoskvlt", 7]]);
  });

  it("promotes an existing historical slug without inserting it again", async () => {
    const queries: string[] = [];
    const sql = vi.fn((parts: TemplateStringsArray) => {
      const query = parts.join("?");
      queries.push(query);
      if (query.includes('SELECT slug, shop_id AS "shopId", canonical')) {
        return Promise.resolve([
          { slug: "kaoskvlt", shopId: 7, canonical: false },
          { slug: "kaoskvlt-2", shopId: 7, canonical: true },
        ]);
      }
      if (query.includes("SELECT id, name")) {
        return Promise.resolve([{ id: 7, name: "KaosKvlt" }]);
      }
      if (query.includes("UPDATE shop_slugs")) return Promise.resolve([]);
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(repairShopSlugs(sql as never)).resolves.toEqual({ repaired: 1 });
    expect(queries.filter((query) => query.includes("INSERT INTO shop_slugs"))).toHaveLength(0);
  });
});
