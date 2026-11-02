import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_context: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  completeManagedHlsBundleUpload: vi.fn(),
  deleteManagedMediaAsset: vi.fn(),
  listManagedMediaAssets: vi.fn(),
  syncMediaFromStorage: vi.fn(),
  updateManagedMediaAsset: vi.fn(),
  uploadManagedHlsBundle: vi.fn(),
  uploadManagedHlsBundleChunk: vi.fn(),
  uploadManagedMediaAsset: vi.fn(),
}));

vi.mock("../services/admin-media.js", () => serviceMocks);

import { mediaRoutes } from "../routes/admin/media.js";

function makeApp() {
  const app = new Hono();
  app.route("/", mediaRoutes);
  return app;
}

describe("admin media routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 when an email template references the asset", async () => {
    serviceMocks.deleteManagedMediaAsset.mockResolvedValue({ ok: false, reason: "in_use" });

    const res = await makeApp().request("/media/7", { method: "DELETE" });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: {
        message: "Media asset is used by an email template",
        code: "MEDIA_IN_USE",
      },
    });
  });
});
