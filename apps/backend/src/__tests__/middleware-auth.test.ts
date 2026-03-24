import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => {
  const chain = {
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(chain),
      }),
      _chain: chain,
    },
  };
});

vi.mock("../db/index.js", () => dbMock);
vi.mock("../db/schema.js", () => ({
  adminUsers: { id: "adminUsers.id", role: "adminUsers.role" },
  sessions: { id: "sessions.id", adminUserId: "sessions.adminUserId", expiresAt: "sessions.expiresAt" },
}));
vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "development" },
}));

import { type AuthVariables, requireAdmin, requireAuth, requireOwner } from "../middleware/auth.js";

type AppType = { Variables: AuthVariables };

function buildApp(middleware: typeof requireAuth) {
  const app = new Hono<AppType>();
  app.use("/*", middleware);
  app.get("/test", (c) => c.json({ role: c.get("role") }));
  return app;
}

describe("requireAuth", () => {
  const app = buildApp(requireAuth);

  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no session cookie", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(401);
  });

  it("returns 401 when session expired", async () => {
    dbMock.db._chain.limit.mockResolvedValue([]);

    const res = await app.request("/test", {
      headers: { Cookie: "session=expired-id" },
    });

    expect(res.status).toBe(401);
  });

  it("sets context vars for valid session", async () => {
    dbMock.db._chain.limit.mockResolvedValue([{ adminId: 1, role: "owner" }]);

    const res = await app.request("/test", {
      headers: { Cookie: "session=valid-id" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "owner" });
  });
});

describe("requireOwner", () => {
  it("returns 401 when no role set", async () => {
    const app = new Hono<AppType>();
    app.use("/*", requireOwner);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    const app = new Hono<AppType>();
    app.use("/*", async (c, next) => {
      c.set("role", "admin");
      c.set("isOwner", false);
      await next();
    });
    app.use("/*", requireOwner);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(403);
  });

  it("passes through for owner", async () => {
    const app = new Hono<AppType>();
    app.use("/*", async (c, next) => {
      c.set("role", "owner");
      c.set("isOwner", true);
      await next();
    });
    app.use("/*", requireOwner);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});

describe("requireAdmin", () => {
  it("returns 401 when no role set", async () => {
    const app = new Hono<AppType>();
    app.use("/*", requireAdmin);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(401);
  });

  it("returns 403 for moderator", async () => {
    const app = new Hono<AppType>();
    app.use("/*", async (c, next) => {
      c.set("role", "moderator");
      await next();
    });
    app.use("/*", requireAdmin);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(403);
  });

  it("passes through for admin", async () => {
    const app = new Hono<AppType>();
    app.use("/*", async (c, next) => {
      c.set("role", "admin");
      await next();
    });
    app.use("/*", requireAdmin);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("passes through for owner", async () => {
    const app = new Hono<AppType>();
    app.use("/*", async (c, next) => {
      c.set("role", "owner");
      await next();
    });
    app.use("/*", requireAdmin);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});
