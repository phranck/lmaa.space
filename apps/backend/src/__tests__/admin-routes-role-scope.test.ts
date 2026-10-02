import { Hono } from "hono";
import type { Context, Next } from "hono";
import { describe, expect, it, vi } from "vitest";

// The real role checks, with the session lookup replaced by a header. What is
// under test is which of them a request meets, and that depends only on how
// the routers are mounted, not on how a session is read.
vi.mock("../middleware/auth.js", () => {
  const requireAuth = async (c: Context, next: Next) => {
    const role = c.req.header("x-test-role");
    if (!role) return c.json({ error: { message: "Unauthorized" } }, 401);
    c.set("adminId", 1);
    c.set("role", role);
    c.set("isOwner", role === "owner");
    await next();
  };
  const requireAdmin = async (c: Context, next: Next) => {
    if (c.get("role") === "moderator") return c.json({ error: { message: "Forbidden" } }, 403);
    await next();
  };
  const requireOwner = async (c: Context, next: Next) => {
    if (!c.get("isOwner")) return c.json({ error: { message: "Forbidden" } }, 403);
    await next();
  };
  return { requireAuth, requireAdmin, requireOwner };
});

// Nothing here may reach a database. A handler that gets as far as one answers
// 500, which is still an answer from past every role check.
vi.mock("../db/client.js", () => {
  const unreachable = new Proxy(
    {},
    {
      get() {
        throw new Error("database not available in this test");
      },
    },
  );
  return { db: unreachable, client: unreachable };
});

import { adminRoutes } from "../routes/admin/routes.js";

function makeApp() {
  const app = new Hono();
  app.route("/", adminRoutes);
  return app;
}

function requestAs(role: string, path: string, init: RequestInit = {}) {
  return makeApp().request(path, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), "x-test-role": role },
  });
}

describe("admin route role checks", () => {
  // Every admin router is mounted at one root, so a check one router registers
  // for all paths runs for every router mounted after it.
  it.each(["/submissions", "/shops", "/categories"])(
    "lets a moderator read %s",
    async (path) => {
      const response = await requestAs("moderator", path);

      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(401);
    },
  );

  it.each(["/stats", "/form-configs", "/settings/bulk", "/submissions/1/review"])(
    "keeps a moderator out of %s",
    async (path) => {
      const response = await requestAs("moderator", path);

      expect(response.status).toBe(403);
    },
  );

  it("keeps a moderator from changing a submission", async () => {
    const response = await requestAs("moderator", "/submissions/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    expect(response.status).toBe(403);
  });

  it("lets an admin who is not the owner reach the routes after the bank connection", async () => {
    const response = await requestAs("admin", "/form-configs");

    expect(response.status).not.toBe(403);
  });

  it("keeps the bank connection's acting routes to the owner", async () => {
    const response = await requestAs("admin", "/bank-connection/sync", { method: "POST" });

    expect(response.status).toBe(403);
  });
});
