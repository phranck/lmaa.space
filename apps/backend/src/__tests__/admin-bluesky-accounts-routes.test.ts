import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock("../services/mastodon-account-validator.js", () => ({
  verifyMastodonCredentials: vi.fn(),
}));

const blueskyValidatorMock = vi.hoisted(() => ({
  verifyBlueskyCredentials: vi.fn(),
}));

vi.mock("../services/bluesky-account-validator.js", () => blueskyValidatorMock);

const serviceMocks = vi.hoisted(() => ({
  createManagedMastodonAccount: vi.fn(),
  updateManagedMastodonAccount: vi.fn(),
  getManagedMastodonAccount: vi.fn(),
  deleteManagedMastodonAccount: vi.fn(),
  createManagedBlueskyAccount: vi.fn(),
  updateManagedBlueskyAccount: vi.fn(),
  getManagedBlueskyAccount: vi.fn(),
  deleteManagedBlueskyAccount: vi.fn(),
}));

vi.mock("../services/social-media-accounts.js", () => serviceMocks);

import { socialMediaAccountRoutes } from "../routes/admin/social-media-accounts.js";

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
  app.route("/", socialMediaAccountRoutes);
  return app;
}

const VALID_BLUESKY_ACCOUNT = {
  id: 1,
  label: "Main",
  handle: "lmaa.bsky.social",
  isActive: true,
  hasAccessToken: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const validPayload = {
  label: "Main",
  handle: "lmaa.bsky.social",
  appPassword: "abcd-efgh-ijkl-mnop",
  isActive: true,
};

describe("POST /social-media/bluesky/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("201 when validator returns ok=true", async () => {
    blueskyValidatorMock.verifyBlueskyCredentials.mockResolvedValue({
      ok: true,
      did: "did:plc:abc",
    });
    serviceMocks.createManagedBlueskyAccount.mockResolvedValue({
      ok: true,
      data: VALID_BLUESKY_ACCOUNT,
    });

    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(201);
    expect(blueskyValidatorMock.verifyBlueskyCredentials).toHaveBeenCalledWith(
      "lmaa.bsky.social",
      "abcd-efgh-ijkl-mnop",
    );
  });

  it("400 when validator returns invalid_credentials", async () => {
    blueskyValidatorMock.verifyBlueskyCredentials.mockResolvedValue({
      ok: false,
      reason: "invalid_credentials",
      message: "rejected",
    });

    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(400);
    expect(serviceMocks.createManagedBlueskyAccount).not.toHaveBeenCalled();
  });

  it("503 when validator returns service_unreachable", async () => {
    blueskyValidatorMock.verifyBlueskyCredentials.mockResolvedValue({
      ok: false,
      reason: "service_unreachable",
      message: "down",
    });

    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(503);
  });

  it("409 when service returns conflict (singleton)", async () => {
    blueskyValidatorMock.verifyBlueskyCredentials.mockResolvedValue({
      ok: true,
      did: "did:plc:abc",
    });
    serviceMocks.createManagedBlueskyAccount.mockResolvedValue({
      ok: false,
      reason: "conflict",
    });

    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(409);
  });

  it("zod rejects malformed handle", async () => {
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, handle: "no-dot" }),
    });
    expect(res.status).toBe(400);
    expect(blueskyValidatorMock.verifyBlueskyCredentials).not.toHaveBeenCalled();
  });

  it("zod rejects malformed app password", async () => {
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, appPassword: "tooshort" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /social-media/bluesky/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the singleton account", async () => {
    serviceMocks.getManagedBlueskyAccount.mockResolvedValue(VALID_BLUESKY_ACCOUNT);
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: typeof VALID_BLUESKY_ACCOUNT | null };
    expect(body.data).toEqual(VALID_BLUESKY_ACCOUNT);
  });

  it("returns null when no account configured", async () => {
    serviceMocks.getManagedBlueskyAccount.mockResolvedValue(null);
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: null };
    expect(body.data).toBeNull();
  });
});

describe("PUT /social-media/bluesky/account/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 without calling validator when no appPassword in payload", async () => {
    serviceMocks.updateManagedBlueskyAccount.mockResolvedValue({
      ok: true,
      data: VALID_BLUESKY_ACCOUNT,
    });
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Renamed", isActive: false }),
    });
    expect(res.status).toBe(200);
    expect(blueskyValidatorMock.verifyBlueskyCredentials).not.toHaveBeenCalled();
  });

  it("validates and 400s when new appPassword is rejected", async () => {
    blueskyValidatorMock.verifyBlueskyCredentials.mockResolvedValue({
      ok: false,
      reason: "invalid_credentials",
      message: "rejected",
    });

    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: "lmaa.bsky.social",
        appPassword: "abcd-efgh-ijkl-mnop",
      }),
    });

    expect(res.status).toBe(400);
    expect(serviceMocks.updateManagedBlueskyAccount).not.toHaveBeenCalled();
  });

  it("400 when appPassword present but handle missing", async () => {
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appPassword: "abcd-efgh-ijkl-mnop" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /social-media/bluesky/account/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 on success", async () => {
    serviceMocks.deleteManagedBlueskyAccount.mockResolvedValue({ ok: true });
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account/1", { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("404 when not found", async () => {
    serviceMocks.deleteManagedBlueskyAccount.mockResolvedValue({
      ok: false,
      reason: "not_found",
    });
    const app = makeApp();
    const res = await app.request("/social-media/bluesky/account/9", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
