import { and, ne } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { shops } from "../db/schema.js";

const select = vi.fn();
const from = vi.fn();
const innerJoin = vi.fn();
const where = vi.fn();
const orderBy = vi.fn();

async function loadRepositoryModule() {
  vi.resetModules();

  select.mockReturnValue({ from });
  from.mockReturnValue({ innerJoin });
  innerJoin.mockReturnValue({ where });
  where.mockReturnValue({ orderBy });
  orderBy.mockResolvedValue([]);

  vi.doMock("../db/index.js", () => ({
    db: {
      select,
    },
  }));

  return import("../repositories/admin-shop-concern-reports.js");
}

describe("admin-shop-concern-reports repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes rejected and deleted shops from the moderation list", async () => {
    const repository = await loadRepositoryModule();

    await repository.listAdminShopConcernReports();

    const expected = and(ne(shops.visibility, "rejected"), ne(shops.visibility, "deleted"));
    const actual = where.mock.calls[0]?.[0];
    const dialect = new PgDialect();

    if (!expected) {
      throw new Error("Expected filter condition to be defined");
    }

    if (!actual) {
      throw new Error("Expected repository query to apply a where clause");
    }

    expect(dialect.sqlToQuery(actual).sql).toBe(dialect.sqlToQuery(expected).sql);
  });
});
