import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  acceptAdminInvite: vi.fn(),
  getAdminInviteState: vi.fn(),
  getAdminSetupState: vi.fn(),
  loginAdmin: vi.fn(),
  logoutAdmin: vi.fn(),
  setupOwnerAdmin: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  SESSION_COOKIE_OPTIONS: { path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
}));

const repoMocks = vi.hoisted(() => ({
  getAdminProfileById: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: { NODE_ENV: "development" },
}));

vi.mock("../services/admin-auth.js", () => serviceMocks);
vi.mock("../services/auth.js", () => authServiceMocks);
vi.mock("../repositories/admin-auth.js", () => repoMocks);
vi.mock("../config/env.js", () => envMock);
vi.mock("../middleware/auth.js", () => ({
  requireAuth: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("adminId", 1);
    c.set("role", "owner");
    c.set("isOwner", true);
    await next();
  }),
}));
vi.mock("../middleware/rate-limit.js", () => ({
  rateLimit: vi.fn(() => (_c: unknown, next: () => Promise<void>) => next()),
}));

import { authRoutes } from "../routes/admin/auth.js";

describe("authRoutes", () => {
  const app = new Hono();
  app.route("/", authRoutes);

  beforeEach(() => vi.clearAllMocks());

  describe("GET /setup", () => {
    it("returns setup state in development", async () => {
      envMock.env.NODE_ENV = "development";
      serviceMocks.getAdminSetupState.mockResolvedValue({ needsSetup: true });

      const res = await app.request("/setup");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { needsSetup: true } });
    });

    it("returns 403 in production", async () => {
      envMock.env.NODE_ENV = "production";

      const res = await app.request("/setup");

      expect(res.status).toBe(403);
      envMock.env.NODE_ENV = "development";
    });
  });

  describe("POST /setup", () => {
    it("creates owner and sets session cookie", async () => {
      envMock.env.NODE_ENV = "development";
      serviceMocks.setupOwnerAdmin.mockResolvedValue({
        ok: true,
        sessionId: "sess-123",
        admin: { id: 1, username: "owner", role: "owner" },
      });

      const res = await app.request("/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "owner",
          email: "owner@example.com",
          password: "super-secret-password",
        }),
      });

      expect(res.status).toBe(201);
      expect(res.headers.get("set-cookie")).toContain("session=sess-123");
    });

    it("returns 403 when setup already completed", async () => {
      envMock.env.NODE_ENV = "development";
      serviceMocks.setupOwnerAdmin.mockResolvedValue({ ok: false, reason: "already_setup" });

      const res = await app.request("/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "owner",
          email: "owner@example.com",
          password: "super-secret-password",
        }),
      });

      expect(res.status).toBe(403);
    });

    it("returns 403 in production", async () => {
      envMock.env.NODE_ENV = "production";

      const res = await app.request("/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "owner",
          email: "owner@example.com",
          password: "super-secret-password",
        }),
      });

      expect(res.status).toBe(403);
      envMock.env.NODE_ENV = "development";
    });
  });

  describe("POST /login", () => {
    it("logs in and sets session cookie", async () => {
      serviceMocks.loginAdmin.mockResolvedValue({
        ok: true,
        sessionId: "sess-456",
        admin: { id: 1, username: "admin", role: "admin" },
      });

      const res = await app.request("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "password" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("set-cookie")).toContain("session=sess-456");
    });

    it("returns 401 for invalid credentials", async () => {
      serviceMocks.loginAdmin.mockResolvedValue({ ok: false, reason: "invalid_credentials" });

      const res = await app.request("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "wrong" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /invite/:token", () => {
    it("returns invite metadata for valid token", async () => {
      serviceMocks.getAdminInviteState.mockResolvedValue({
        ok: true,
        username: "mod",
        email: "mod@example.com",
      });

      const res = await app.request("/invite/abc123");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { username: "mod", email: "mod@example.com" } });
    });

    it("returns 404 for invalid invite", async () => {
      serviceMocks.getAdminInviteState.mockResolvedValue({
        ok: false,
        reason: "invalid_invite",
      });

      const res = await app.request("/invite/bad-token");

      expect(res.status).toBe(404);
    });

    it("returns 410 for expired invite", async () => {
      serviceMocks.getAdminInviteState.mockResolvedValue({
        ok: false,
        reason: "expired_invite",
      });

      const res = await app.request("/invite/expired");

      expect(res.status).toBe(410);
    });
  });

  describe("POST /invite/accept", () => {
    it("accepts invite and sets session cookie", async () => {
      serviceMocks.acceptAdminInvite.mockResolvedValue({
        ok: true,
        sessionId: "sess-789",
        admin: { id: 5, username: "mod", role: "moderator" },
      });

      const res = await app.request("/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "a".repeat(32), password: "secure-password" }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("set-cookie")).toContain("session=sess-789");
    });

    it("returns 404 for invalid invite", async () => {
      serviceMocks.acceptAdminInvite.mockResolvedValue({
        ok: false,
        reason: "invalid_invite",
      });

      const res = await app.request("/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "b".repeat(32), password: "password1" }),
      });

      expect(res.status).toBe(404);
    });

    it("returns 410 for expired invite", async () => {
      serviceMocks.acceptAdminInvite.mockResolvedValue({
        ok: false,
        reason: "expired_invite",
      });

      const res = await app.request("/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "c".repeat(32), password: "password1" }),
      });

      expect(res.status).toBe(410);
    });
  });

  describe("POST /logout", () => {
    it("logs out and clears session cookie", async () => {
      const res = await app.request("/logout", {
        method: "POST",
        headers: { Cookie: "session=sess-123" },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { message: "Logged out" } });
      expect(serviceMocks.logoutAdmin).toHaveBeenCalledWith("sess-123");
    });
  });

  describe("GET /me", () => {
    it("returns admin profile", async () => {
      repoMocks.getAdminProfileById.mockResolvedValue({
        id: 1,
        username: "owner",
        role: "owner",
        email: "owner@example.com",
      });

      const res = await app.request("/me");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.username).toBe("owner");
      expect(body.data.isOwner).toBe(true);
    });

    it("returns 404 when admin not found", async () => {
      repoMocks.getAdminProfileById.mockResolvedValue(null);

      const res = await app.request("/me");

      expect(res.status).toBe(404);
    });
  });
});
