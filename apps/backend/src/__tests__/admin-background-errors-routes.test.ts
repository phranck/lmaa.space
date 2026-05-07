import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAuth: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const repoMocks = vi.hoisted(() => ({
  listBackgroundErrors: vi.fn(),
  getBackgroundErrorById: vi.fn(),
  resolveBackgroundError: vi.fn(),
}));

vi.mock("../repositories/background-errors.js", () => repoMocks);

import { backgroundErrorsRoutes } from "../routes/admin/background-errors.js";

function makeApp(adminId = 1) {
  const app = new Hono<{ Variables: { adminId: number; role: string; isOwner: boolean } }>();
  app.use("*", async (c, next) => {
    c.set("adminId", adminId);
    c.set("role", "admin");
    c.set("isOwner", false);
    await next();
  });
  app.route("/", backgroundErrorsRoutes);
  return app;
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    source: "mastodon-post",
    message: "Mastodon post failed with 422",
    context: { accountId: 3, templateId: 7 },
    occurredAt: new Date("2025-01-01T10:00:00Z"),
    resolvedAt: null,
    resolvedBy: null,
    ...overrides,
  };
}

describe("GET /background-errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a list of background errors", async () => {
    const rows = [makeRow(), makeRow({ id: 2, source: "shop-reminders" })];
    repoMocks.listBackgroundErrors.mockResolvedValue(rows);

    const app = makeApp();
    const res = await app.request("/background-errors");

    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toHaveLength(2);
    expect(repoMocks.listBackgroundErrors).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
  });

  it("passes resolved=false filter to repository", async () => {
    repoMocks.listBackgroundErrors.mockResolvedValue([makeRow()]);

    const app = makeApp();
    const res = await app.request("/background-errors?resolved=false");

    expect(res.status).toBe(200);
    expect(repoMocks.listBackgroundErrors).toHaveBeenCalledWith(
      expect.objectContaining({ resolved: false }),
    );
  });

  it("passes source filter to repository", async () => {
    repoMocks.listBackgroundErrors.mockResolvedValue([makeRow()]);

    const app = makeApp();
    const res = await app.request("/background-errors?source=mastodon-post");

    expect(res.status).toBe(200);
    expect(repoMocks.listBackgroundErrors).toHaveBeenCalledWith(
      expect.objectContaining({ source: "mastodon-post" }),
    );
  });
});

describe("POST /background-errors/:id/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves an existing error and returns the updated row", async () => {
    const row = makeRow();
    const resolved = { ...row, resolvedAt: new Date("2025-01-01T11:00:00Z"), resolvedBy: 1 };
    repoMocks.resolveBackgroundError.mockResolvedValue(resolved);

    const app = makeApp(1);
    const res = await app.request("/background-errors/1/resolve", { method: "POST" });

    expect(res.status).toBe(200);
    expect(repoMocks.resolveBackgroundError).toHaveBeenCalledWith(1, 1);
  });

  it("returns 404 when the error does not exist", async () => {
    repoMocks.resolveBackgroundError.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request("/background-errors/999/resolve", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json() as { error: { message: string } };
    expect(body.error.message).toMatch(/not found/i);
  });

  it("returns 400 for a non-numeric id", async () => {
    const app = makeApp();
    const res = await app.request("/background-errors/abc/resolve", { method: "POST" });

    expect(res.status).toBe(400);
  });
});
