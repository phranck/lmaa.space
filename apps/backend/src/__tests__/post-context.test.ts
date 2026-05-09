import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    FRONTEND_URL: "https://test.example",
    DASHBOARD_URL: "https://dash.example",
  },
}));

vi.mock("@lmaa/shared", async () => {
  const actual = await vi.importActual<typeof import("@lmaa/shared")>("@lmaa/shared");
  return { ...actual, encodeShopToken: (id: number) => `tok-${id}` };
});

import type { Category, Submission } from "../db/schema.js";
import { buildPostVariables, idempotencyEntityKey } from "../services/post-context.js";

const baseSubmission: Submission = {
  id: 42,
  shopName: "Shop A",
  shopUrl: "https://shop-a.test",
  description: "desc",
  region: ["DE", "AT"],
  shipping: "DE",
  pickup: "no",
  contactEmail: "a@b.c",
  // Note: any other required fields can be filled with defaults / cast as Submission;
  // this test only exercises the variable builder.
} as unknown as Submission;

const baseCategory: Category = {
  id: 7,
  name: "Cat",
  slug: "cat",
  description: "Cat description",
  imageUrl: "https://img.example/c.jpg",
} as unknown as Category;

describe("post-context", () => {
  describe("buildPostVariables", () => {
    it("renders submission variables", () => {
      const vars = buildPostVariables({
        kind: "submission",
        submission: baseSubmission,
        newShopId: 99,
        adminNote: "looks fine",
        categoryNames: ["food", "books"],
      });
      expect(vars.shopName).toBe("Shop A");
      expect(vars.shopPageUrl).toBe("https://test.example/shop/tok-99");
      expect(vars.shopCategories).toBe("food, books");
      expect(vars.adminNote).toBe("looks fine");
      expect(vars.frontendUrl).toBe("https://test.example");
    });

    it("renders category variables", () => {
      const vars = buildPostVariables({ kind: "category", category: baseCategory });
      expect(vars.categoryName).toBe("Cat");
      expect(vars.categoryUrl).toBe("https://test.example/category/cat");
      expect(vars.categoryImageUrl).toBe("https://img.example/c.jpg");
      expect(vars.categoryDescription).toBe("Cat description");
      expect(vars.frontendUrl).toBe("https://test.example");
      expect(vars.dashboardUrl).toBe("https://dash.example");
    });

    it("returns empty string for missing optional category fields", () => {
      const vars = buildPostVariables({
        kind: "category",
        category: { ...baseCategory, description: null, imageUrl: null } as unknown as Category,
      });
      expect(vars.categoryDescription).toBe("");
      expect(vars.categoryImageUrl).toBe("");
    });
  });

  describe("idempotencyEntityKey", () => {
    it("returns submission key", () => {
      expect(
        idempotencyEntityKey({
          kind: "submission",
          submission: baseSubmission,
          newShopId: 99,
          adminNote: "",
          categoryNames: [],
        }),
      ).toBe("submission:42");
    });
    it("returns category key", () => {
      expect(idempotencyEntityKey({ kind: "category", category: baseCategory })).toBe(
        "category:7",
      );
    });
  });
});
