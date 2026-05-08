import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const validatorMock = vi.hoisted(() => ({
  verifyMastodonCredentials: vi.fn(),
}));

vi.mock("../services/mastodon-account-validator.js", () => validatorMock);

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

const VALID_MASTODON_ACCOUNT = {
  id: 1,
  label: "Test",
  instanceUrl: "https://mastodon.social",
  username: "testuser",
  visibility: "public",
  maxPostCharacters: 500,
  isActive: true,
  hasAccessToken: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("POST /social-media/mastodon/account — token validation + singleton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("201 when validator returns ok=true", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "testuser",
    });
    serviceMocks.createManagedMastodonAccount.mockResolvedValue({
      ok: true,
      data: VALID_MASTODON_ACCOUNT,
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "valid-token",
        visibility: "public",
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
  });

  it("409 when service returns conflict (singleton already exists)", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "testuser",
    });
    serviceMocks.createManagedMastodonAccount.mockResolvedValue({
      ok: false,
      reason: "conflict",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "valid-token",
        visibility: "public",
        isActive: true,
      }),
    });

    expect(res.status).toBe(409);
  });

  it("400 when validator returns invalid_token", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: false,
      reason: "invalid_token",
      message: "rejected",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "bad",
        visibility: "public",
        isActive: true,
      }),
    });

    expect(res.status).toBe(400);
    expect(serviceMocks.createManagedMastodonAccount).not.toHaveBeenCalled();
  });

  it("503 when validator returns instance_unreachable", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: false,
      reason: "instance_unreachable",
      message: "down",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "any",
        visibility: "public",
        isActive: true,
      }),
    });

    expect(res.status).toBe(503);
    expect(serviceMocks.createManagedMastodonAccount).not.toHaveBeenCalled();
  });

  it("preserves maxPostCharacters when supplied", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "u",
    });
    serviceMocks.createManagedMastodonAccount.mockResolvedValue({
      ok: true,
      data: { ...VALID_MASTODON_ACCOUNT, maxPostCharacters: 800 },
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "valid",
        visibility: "public",
        maxPostCharacters: 800,
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const callArg = serviceMocks.createManagedMastodonAccount.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(callArg.maxPostCharacters).toBe(800);
  });
});

describe("GET /social-media/mastodon/account — singleton response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the singleton account or null", async () => {
    serviceMocks.getManagedMastodonAccount.mockResolvedValue(VALID_MASTODON_ACCOUNT);
    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: typeof VALID_MASTODON_ACCOUNT | null };
    expect(body.data).toEqual(VALID_MASTODON_ACCOUNT);
  });

  it("returns null when no account configured", async () => {
    serviceMocks.getManagedMastodonAccount.mockResolvedValue(null);
    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: null };
    expect(body.data).toBeNull();
  });
});

describe("PUT /social-media/mastodon/account/:id — token validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 without calling validator when no accessToken in payload", async () => {
    serviceMocks.updateManagedMastodonAccount.mockResolvedValue({
      ok: true,
      data: VALID_MASTODON_ACCOUNT,
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "New Label" }),
    });

    expect(res.status).toBe(200);
    expect(validatorMock.verifyMastodonCredentials).not.toHaveBeenCalled();
  });

  it("200 and validates when accessToken is present", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "u",
    });
    serviceMocks.updateManagedMastodonAccount.mockResolvedValue({
      ok: true,
      data: VALID_MASTODON_ACCOUNT,
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceUrl: "https://mastodon.social",
        accessToken: "new-valid-token",
      }),
    });

    expect(res.status).toBe(200);
    expect(validatorMock.verifyMastodonCredentials).toHaveBeenCalledWith(
      "https://mastodon.social",
      "new-valid-token",
    );
  });

  it("400 when accessToken present but instanceUrl missing", async () => {
    const app = makeApp();
    const res = await app.request("/social-media/mastodon/account/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: "some-token" }),
    });

    expect(res.status).toBe(400);
  });
});
