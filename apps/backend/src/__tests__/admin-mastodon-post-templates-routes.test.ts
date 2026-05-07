import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  createManagedMastodonPostTemplate: vi.fn(),
  updateManagedMastodonPostTemplate: vi.fn(),
  getManagedMastodonPostTemplates: vi.fn(),
  getManagedMastodonPostTemplateById: vi.fn(),
  deleteManagedMastodonPostTemplate: vi.fn(),
}));

vi.mock("../services/mastodon-post-templates.js", () => serviceMocks);

import { mastodonPostTemplateRoutes } from "../routes/admin/mastodon-post-templates.js";

/**
 * Build a Hono test app that injects `isOwner` on every request before
 * hitting the routes under test.
 */
function makeApp(isOwner: boolean) {
  const app = new Hono<{ Variables: { isOwner: boolean; adminId: number; role: string } }>();
  app.use("*", async (c, next) => {
    c.set("isOwner", isOwner);
    c.set("adminId", 1);
    c.set("role", isOwner ? "owner" : "admin");
    await next();
  });
  app.route("/", mastodonPostTemplateRoutes);
  return app;
}

describe("mastodon-post-templates routes — owner gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /mastodon-post-templates", () => {
    it("allows owner to set isSystemTemplate=true", async () => {
      const template = {
        id: 1,
        name: "sys",
        bodyText: "hello",
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedMastodonPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/mastodon-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "sys", bodyText: "hello", isSystemTemplate: true }),
      });

      expect(res.status).toBe(201);
      expect(serviceMocks.createManagedMastodonPostTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ isSystemTemplate: true }),
      );
    });

    it("silently strips isSystemTemplate for non-owner on create", async () => {
      const template = {
        id: 2,
        name: "regular",
        bodyText: "world",
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedMastodonPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(false);
      const res = await app.request("/mastodon-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "regular", bodyText: "world", isSystemTemplate: true }),
      });

      expect(res.status).toBe(201);
      // isSystemTemplate must have been stripped (undefined) in the payload sent to service
      const callArg = serviceMocks.createManagedMastodonPostTemplate.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg.isSystemTemplate).toBeUndefined();
    });
  });

  describe("PUT /mastodon-post-templates/:id", () => {
    it("allows owner to set isSystemTemplate=true on update", async () => {
      const template = {
        id: 5,
        name: "sys",
        bodyText: "body",
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.updateManagedMastodonPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/mastodon-post-templates/5", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSystemTemplate: true }),
      });

      expect(res.status).toBe(200);
      expect(serviceMocks.updateManagedMastodonPostTemplate).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ isSystemTemplate: true }),
      );
    });

    it("silently strips isSystemTemplate for non-owner on update", async () => {
      const template = {
        id: 6,
        name: "t",
        bodyText: "b",
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.updateManagedMastodonPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(false);
      const res = await app.request("/mastodon-post-templates/6", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText: "new body", isSystemTemplate: true }),
      });

      expect(res.status).toBe(200);
      const callArg = serviceMocks.updateManagedMastodonPostTemplate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArg.isSystemTemplate).toBeUndefined();
      // Other fields should still pass through
      expect(callArg.bodyText).toBe("new body");
    });
  });
});
