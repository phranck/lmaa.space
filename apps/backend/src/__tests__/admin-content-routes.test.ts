import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  createManagedContentPage: vi.fn(),
  deleteManagedContentPage: vi.fn(),
  getManagedContentPage: vi.fn(),
  getManagedContentPages: vi.fn(),
  updateManagedContentPageBody: vi.fn(),
  updateManagedContentPageMeta: vi.fn(),
}));

const previewMocks = vi.hoisted(() => ({
  createContentPreviewSession: vi.fn(),
}));

vi.mock("../services/admin-content.js", () => serviceMocks);
vi.mock("../services/content-preview-store.js", () => previewMocks);

import { contentRoutes } from "../routes/admin/content.js";

function makeApp() {
  const app = new Hono<{
    Variables: { isOwner: boolean; adminId: number; role: string };
  }>();
  app.use("*", async (c, next) => {
    c.set("isOwner", false);
    c.set("adminId", 1);
    c.set("role", "admin");
    await next();
  });
  app.route("/", contentRoutes);
  return app;
}

describe("content routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /content/:slug/preview-sessions", () => {
    it("creates a preview session for the current editor payload", async () => {
      previewMocks.createContentPreviewSession.mockReturnValue({
        token: "a".repeat(32),
        expiresAt: "2026-06-05T12:00:00.000Z",
      });

      const app = makeApp();
      const payload = {
        slug: "draft-page",
        title: "Draft Page",
        content: "# Unsaved draft",
        showTitle: true,
        contentWidth: "wide",
      };
      const res = await app.request("/content/draft-page/preview-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      expect(previewMocks.createContentPreviewSession).toHaveBeenCalledWith(payload);
      expect(await res.json()).toEqual({
        data: {
          token: "a".repeat(32),
          expiresAt: "2026-06-05T12:00:00.000Z",
        },
      });
    });

    it("rejects invalid preview payloads", async () => {
      const app = makeApp();
      const res = await app.request("/content/draft-page/preview-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "INVALID",
          title: "Draft Page",
          content: "# Draft",
          showTitle: true,
          contentWidth: "wide",
        }),
      });

      expect(res.status).toBe(400);
      expect(previewMocks.createContentPreviewSession).not.toHaveBeenCalled();
    });
  });
});
