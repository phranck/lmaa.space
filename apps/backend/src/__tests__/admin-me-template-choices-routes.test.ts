import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const repoMock = vi.hoisted(() => ({
  listChoicesForAdminUser: vi.fn(),
}));

vi.mock("../repositories/admin-user-account-template-choice.js", () => repoMock);

import { meTemplateChoicesRoutes } from "../routes/admin/me-template-choices.js";

function makeApp(adminId = 1) {
  const app = new Hono<{
    Variables: { isOwner: boolean; adminId: number; role: string };
  }>();
  app.use("*", async (c, next) => {
    c.set("isOwner", false);
    c.set("adminId", adminId);
    c.set("role", "admin");
    await next();
  });
  app.route("/", meTemplateChoicesRoutes);
  return app;
}

describe("GET /me/template-choices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("empty initial state returns {}", async () => {
    repoMock.listChoicesForAdminUser.mockResolvedValue([]);
    const app = makeApp();
    const res = await app.request("/me/template-choices?scope=submission");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data).toEqual({});
    expect(repoMock.listChoicesForAdminUser).toHaveBeenCalledWith(1, "submission");
  });

  it("returns map keyed by socialMediaAccountId", async () => {
    repoMock.listChoicesForAdminUser.mockResolvedValue([
      { adminUserId: 1, socialMediaAccountId: 10, templateId: 7, updatedAt: new Date() },
      { adminUserId: 1, socialMediaAccountId: 11, templateId: null, updatedAt: new Date() },
    ]);
    const app = makeApp();
    const res = await app.request("/me/template-choices?scope=submission");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, number | null> };
    expect(body.data).toEqual({ "10": 7, "11": null });
  });

  it("scopes to the authenticated admin user", async () => {
    repoMock.listChoicesForAdminUser.mockResolvedValue([]);
    const app = makeApp(42);
    await app.request("/me/template-choices?scope=submission");
    expect(repoMock.listChoicesForAdminUser).toHaveBeenCalledWith(42, "submission");
  });

  it("forwards the category scope to the repository", async () => {
    repoMock.listChoicesForAdminUser.mockResolvedValue([]);
    const app = makeApp(7);
    await app.request("/me/template-choices?scope=category");
    expect(repoMock.listChoicesForAdminUser).toHaveBeenCalledWith(7, "category");
  });

  it("returns 400 when scope query param is missing", async () => {
    const app = makeApp();
    const res = await app.request("/me/template-choices");
    expect(res.status).toBe(400);
    expect(repoMock.listChoicesForAdminUser).not.toHaveBeenCalled();
  });

  it("returns 400 when scope query param is unknown", async () => {
    const app = makeApp();
    const res = await app.request("/me/template-choices?scope=bogus");
    expect(res.status).toBe(400);
    expect(repoMock.listChoicesForAdminUser).not.toHaveBeenCalled();
  });
});
