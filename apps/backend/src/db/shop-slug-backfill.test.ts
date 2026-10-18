import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { backfillShopSlugs, repairShopSlugs } from "./shop-slug-backfill.js";
import { SHOP_SLUG_ALLOCATION_LOCK } from "./shop-slug-lock.js";

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

  it("repairs a canonical slug without creating an alias", async () => {
    const updates: Array<[string, number]> = [];
    const sql = vi.fn((parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("?");
      if (query.includes('SELECT slug, shop_id AS "shopId"')) {
        return Promise.resolve([
          { slug: "kaoskvlt-2", shopId: 7 },
          { slug: "stable-shop", shopId: 8 },
        ]);
      }
      if (query.includes("SELECT id, name")) {
        return Promise.resolve([
          { id: 7, name: "KaosKvlt" },
          { id: 8, name: "Stable Shop" },
        ]);
      }
      if (query.includes("UPDATE shop_slugs")) {
        updates.push(values as [string, number]);
        return Promise.resolve([]);
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(repairShopSlugs(sql as never)).resolves.toEqual({ repaired: 1 });
    expect(updates).toEqual([["kaoskvlt", 7]]);
  });

  it("makes reconciliation idempotent once every shop has one canonical row", async () => {
    const queries: string[] = [];
    const sql = vi.fn((parts: TemplateStringsArray) => {
      const query = parts.join("?");
      queries.push(query);
      if (query.includes('SELECT slug, shop_id AS "shopId"')) {
        return Promise.resolve([{ slug: "kaoskvlt", shopId: 7 }]);
      }
      if (query.includes("SELECT id, name")) {
        return Promise.resolve([{ id: 7, name: "KaosKvlt" }]);
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(repairShopSlugs(sql as never)).resolves.toEqual({ repaired: 0 });
    expect(queries.filter((query) => query.includes("UPDATE shop_slugs"))).toHaveLength(0);
  });

  it("locks allocation, deletes aliases, and enforces one slug per shop in the migration", () => {
    const migration = readFileSync(
      new URL("../../drizzle/0104_nosy_tempest.sql", import.meta.url),
      "utf8",
    );

    expect(migration.indexOf(`pg_advisory_xact_lock(${SHOP_SLUG_ALLOCATION_LOCK})`)).toBeLessThan(
      migration.indexOf('DELETE FROM "shop_slugs" WHERE "canonical" = false'),
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "shop_slugs_shop_id_unique" ON "shop_slugs" USING btree ("shop_id")',
    );
    expect(migration).toContain(
      'ADD CONSTRAINT "shop_slugs_canonical_check" CHECK ("shop_slugs"."canonical" = true)',
    );
  });
});
