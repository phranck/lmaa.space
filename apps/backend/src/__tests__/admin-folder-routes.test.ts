import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_context: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  createFolder: vi.fn(),
  deleteFolderCascade: vi.fn(),
  getFolderContents: vi.fn(),
  updateFolder: vi.fn(),
}));

vi.mock("../services/admin-folders.js", () => serviceMocks);

import { folderRoutes } from "../routes/admin/folders.js";

describe("admin folder routes", () => {
  it("returns 409 when a contained asset is referenced by an email template", async () => {
    serviceMocks.deleteFolderCascade.mockRejectedValue(new Error("media_in_use"));
    const app = new Hono();
    app.route("/", folderRoutes);

    const res = await app.request("/media/folders/1", { method: "DELETE" });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: {
        message: "Media asset is used by an email template",
        code: "MEDIA_IN_USE",
      },
    });
  });
});
