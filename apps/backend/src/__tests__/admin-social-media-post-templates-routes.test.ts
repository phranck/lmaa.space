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
  createManagedSocialMediaPostTemplate: vi.fn(),
  updateManagedSocialMediaPostTemplate: vi.fn(),
  getManagedSocialMediaPostTemplates: vi.fn(),
  getManagedSocialMediaPostTemplateById: vi.fn(),
  deleteManagedSocialMediaPostTemplate: vi.fn(),
}));

vi.mock("../services/social-media-post-templates.js", () => serviceMocks);

import { socialMediaPostTemplateRoutes } from "../routes/admin/social-media-post-templates.js";

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
  app.route("/", socialMediaPostTemplateRoutes);
  return app;
}

describe("social-media-post-templates routes — owner gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /social-media-post-templates", () => {
    it("allows owner to set isSystemTemplate=true", async () => {
      const template = {
        id: 1,
        name: "sys",
        platforms: ["mastodon"],
        bodyMastodon: "hello",
        bodyBluesky: null,
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedSocialMediaPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/social-media-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "sys",
          platforms: ["mastodon"],
          bodyMastodon: "hello",
          isSystemTemplate: true,
        }),
      });

      expect(res.status).toBe(201);
      expect(serviceMocks.createManagedSocialMediaPostTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ isSystemTemplate: true }),
      );
    });

    it("silently strips isSystemTemplate for non-owner on create", async () => {
      const template = {
        id: 2,
        name: "regular",
        platforms: ["mastodon"],
        bodyMastodon: "world",
        bodyBluesky: null,
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedSocialMediaPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(false);
      const res = await app.request("/social-media-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "regular",
          platforms: ["mastodon"],
          bodyMastodon: "world",
          isSystemTemplate: true,
        }),
      });

      expect(res.status).toBe(201);
      // isSystemTemplate must have been stripped (undefined) in the payload sent to service
      const callArg = serviceMocks.createManagedSocialMediaPostTemplate.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg.isSystemTemplate).toBeUndefined();
    });

    it("rejects creation when platforms is empty", async () => {
      const app = makeApp(true);
      const res = await app.request("/social-media-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "empty",
          platforms: [],
          bodyMastodon: "x",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects creation when mastodon body is missing for mastodon-platform template", async () => {
      const app = makeApp(true);
      const res = await app.request("/social-media-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "missing-mastodon-body",
          platforms: ["mastodon"],
        }),
      });
      expect(res.status).toBe(400);
    });

    it("accepts a multi-platform template with both bodies set", async () => {
      const template = {
        id: 3,
        name: "multi",
        platforms: ["mastodon", "bluesky"],
        bodyMastodon: "Mastodon body",
        bodyBluesky: "Bluesky body",
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.createManagedSocialMediaPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/social-media-post-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "multi",
          platforms: ["mastodon", "bluesky"],
          bodyMastodon: "Mastodon body",
          bodyBluesky: "Bluesky body",
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  describe("PUT /social-media-post-templates/:id", () => {
    it("allows owner to set isSystemTemplate=true on update", async () => {
      const template = {
        id: 5,
        name: "sys",
        platforms: ["mastodon"],
        bodyMastodon: "body",
        bodyBluesky: null,
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.updateManagedSocialMediaPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(true);
      const res = await app.request("/social-media-post-templates/5", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "sys",
          platforms: ["mastodon"],
          bodyMastodon: "body",
          isSystemTemplate: true,
        }),
      });

      expect(res.status).toBe(200);
      expect(serviceMocks.updateManagedSocialMediaPostTemplate).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ isSystemTemplate: true }),
      );
    });

    it("silently strips isSystemTemplate for non-owner on update", async () => {
      const template = {
        id: 6,
        name: "t",
        platforms: ["mastodon"],
        bodyMastodon: "b",
        bodyBluesky: null,
        isSystemTemplate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      serviceMocks.updateManagedSocialMediaPostTemplate.mockResolvedValue({ ok: true, data: template });

      const app = makeApp(false);
      const res = await app.request("/social-media-post-templates/6", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "t",
          platforms: ["mastodon"],
          bodyMastodon: "new body",
          isSystemTemplate: true,
        }),
      });

      expect(res.status).toBe(200);
      const callArg = serviceMocks.updateManagedSocialMediaPostTemplate.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArg.isSystemTemplate).toBeUndefined();
      // Other fields should still pass through
      expect(callArg.bodyMastodon).toBe("new body");
    });
  });
});
