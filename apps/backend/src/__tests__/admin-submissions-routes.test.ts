import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "development", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const repoMocks = vi.hoisted(() => ({
  editSubmission: vi.fn(),
  getAdminSubmissionById: vi.fn(),
  listAdminSubmissions: vi.fn(),
  setReadyForReview: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  deleteAdminSubmission: vi.fn(),
  reviewAdminSubmission: vi.fn(),
}));

const dbMock = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("../repositories/admin-submissions.js", () => repoMocks);
vi.mock("../services/admin-submissions.js", () => serviceMocks);
vi.mock("../db/client.js", () => dbMock);
vi.mock("../db/schema.js", () => ({
  categories: { id: "categories.id", name: "categories.name" },
}));
vi.mock("../lib/shopjson-mapper.js", () => ({
  mapShopJsonToShopData: vi.fn(() => ({
    name: "Shop",
    url: "https://shop.de",
    categoryIds: [],
  })),
}));

import { submissionsRoutes } from "../routes/admin/submissions.js";

describe("submissionsRoutes", () => {
  const app = new Hono();
  app.route("/", submissionsRoutes);

  beforeEach(() => vi.clearAllMocks());

  describe("GET /submissions", () => {
    it("returns all submissions", async () => {
      repoMocks.listAdminSubmissions.mockResolvedValue([{ id: 1 }]);

      const res = await app.request("/submissions");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: 1 }] });
    });

    it("filters by status", async () => {
      repoMocks.listAdminSubmissions.mockResolvedValue([]);

      const res = await app.request("/submissions?status=pending");

      expect(res.status).toBe(200);
      expect(repoMocks.listAdminSubmissions).toHaveBeenCalledWith("pending");
    });

    it("returns 400 for invalid status", async () => {
      const res = await app.request("/submissions?status=bogus");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /submissions/:id", () => {
    it("returns submission by id", async () => {
      repoMocks.getAdminSubmissionById.mockResolvedValue({ id: 1, shopName: "Shop" });

      const res = await app.request("/submissions/1");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: 1, shopName: "Shop" } });
    });

    it("returns 404 when not found", async () => {
      repoMocks.getAdminSubmissionById.mockResolvedValue(null);

      const res = await app.request("/submissions/99");

      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid id", async () => {
      const res = await app.request("/submissions/abc");
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /submissions/:id (review)", () => {
    it("reviews and returns submission", async () => {
      serviceMocks.reviewAdminSubmission.mockResolvedValue({
        ok: true,
        submission: { id: 1, status: "approved" },
      });

      const res = await app.request("/submissions/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: 1, status: "approved" } });
    });

    it("passes notification template id and templateAssignments to the service", async () => {
      serviceMocks.reviewAdminSubmission.mockResolvedValue({
        ok: true,
        submission: { id: 1, status: "approved" },
      });

      const res = await app.request("/submissions/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          notificationTemplateId: 7,
          templateAssignments: [
            { accountId: 1, templateId: 9 },
            { accountId: 2, templateId: null },
          ],
        }),
      });

      expect(res.status).toBe(200);
      expect(serviceMocks.reviewAdminSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationTemplateId: 7,
          templateAssignments: [
            { accountId: 1, templateId: 9 },
            { accountId: 2, templateId: null },
          ],
        }),
      );
    });

    it("zod rejects malformed templateAssignments entry", async () => {
      const res = await app.request("/submissions/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          templateAssignments: [{ accountId: -1, templateId: 9 }],
        }),
      });
      expect(res.status).toBe(400);
      expect(serviceMocks.reviewAdminSubmission).not.toHaveBeenCalled();
    });

    it("approving without templateAssignments still works (no posts)", async () => {
      serviceMocks.reviewAdminSubmission.mockResolvedValue({
        ok: true,
        submission: { id: 1, status: "approved" },
      });

      const res = await app.request("/submissions/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      expect(res.status).toBe(200);
      expect(serviceMocks.reviewAdminSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          templateAssignments: undefined,
        }),
      );
    });

    it("returns 404 when submission not found", async () => {
      serviceMocks.reviewAdminSubmission.mockResolvedValue({ ok: false, reason: "not_found" });

      const res = await app.request("/submissions/99", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 409 when approving a submission whose domain already has a public shop", async () => {
      serviceMocks.reviewAdminSubmission.mockResolvedValue({
        ok: false,
        reason: "shop_exists",
        existingShopName: "Good Karma Coffee",
      });

      const res = await app.request("/submissions/442", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: { code: string; existingShopName: string } };
      expect(body.error.code).toBe("DOMAIN_CONFLICT");
      expect(body.error.existingShopName).toBe("Good Karma Coffee");
    });
  });

  describe("PATCH /submissions/:id/edit", () => {
    it("passes shop check notes to the repository", async () => {
      repoMocks.editSubmission.mockResolvedValue({ id: 1, shopName: "Shop" });

      const res = await app.request("/submissions/1/edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: "Shop",
          shopUrl: "https://shop.de",
          description: "Description",
          region: ["DE"],
          shipping: "Germany",
          categoryIds: [1],
          shopCheckNotes: {
            focus: ["Siebdruck"],
            brandsOrProducts: ["BirdShirts"],
            companyPresentation: "Small textile printer",
          },
          socialMedia: {},
        }),
      });

      expect(res.status).toBe(200);
      expect(repoMocks.editSubmission).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          shopCheckNotes: {
            focus: ["Siebdruck"],
            brandsOrProducts: ["BirdShirts"],
            companyPresentation: "Small textile printer",
          },
        }),
      );
    });
  });

  describe("DELETE /submissions/:id", () => {
    it("deletes submission successfully", async () => {
      serviceMocks.deleteAdminSubmission.mockResolvedValue({ ok: true });

      const res = await app.request("/submissions/1", { method: "DELETE" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { message: "Submission deleted" } });
    });

    it("returns 404 when not found", async () => {
      serviceMocks.deleteAdminSubmission.mockResolvedValue({
        ok: false,
        reason: "not_found",
      });

      const res = await app.request("/submissions/99", { method: "DELETE" });

      expect(res.status).toBe(404);
    });
  });
});
