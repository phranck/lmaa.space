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

const serviceMocks = vi.hoisted(() => ({
  createManagedMastodonAccount: vi.fn(),
  updateManagedMastodonAccount: vi.fn(),
  getManagedMastodonAccounts: vi.fn(),
  deleteManagedMastodonAccount: vi.fn(),
}));

vi.mock("../services/social-media-accounts.js", () => serviceMocks);

import { socialMediaAccountRoutes } from "../routes/admin/social-media-accounts.js";

function makeApp() {
  const app = new Hono<{ Variables: { isOwner: boolean; adminId: number; role: string } }>();
  app.use("*", async (c, next) => {
    c.set("isOwner", false);
    c.set("adminId", 1);
    c.set("role", "admin");
    await next();
  });
  app.route("/", socialMediaAccountRoutes);
  return app;
}

const VALID_ACCOUNT = {
  id: 1,
  label: "Test",
  instanceUrl: "https://mastodon.social",
  username: "testuser",
  visibility: "public",
  isActive: true,
  hasAccessToken: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("POST /social-media/mastodon/accounts — token validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("201 when validator returns ok=true", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "testuser",
    });
    serviceMocks.createManagedMastodonAccount.mockResolvedValue(VALID_ACCOUNT);

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts", {
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
    expect(validatorMock.verifyMastodonCredentials).toHaveBeenCalledWith(
      "https://mastodon.social",
      "valid-token",
    );
  });

  it("backfills username from validator when payload has no username", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "auto_filled",
    });
    serviceMocks.createManagedMastodonAccount.mockResolvedValue(VALID_ACCOUNT);

    const app = makeApp();
    await app.request("/social-media/mastodon/accounts", {
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

    const callArg = serviceMocks.createManagedMastodonAccount.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(callArg.username).toBe("auto_filled");
  });

  it("does not overwrite username when payload provides one", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "validator_username",
    });
    serviceMocks.createManagedMastodonAccount.mockResolvedValue(VALID_ACCOUNT);

    const app = makeApp();
    await app.request("/social-media/mastodon/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        username: "my_username",
        accessToken: "valid-token",
        visibility: "public",
        isActive: true,
      }),
    });

    const callArg = serviceMocks.createManagedMastodonAccount.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(callArg.username).toBe("my_username");
  });

  it("400 when validator returns reason=invalid_token", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: false,
      reason: "invalid_token",
      message: "The Mastodon instance rejected the access token.",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "bad-token",
        visibility: "public",
        isActive: true,
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Mastodon rejected the access token");
    expect(serviceMocks.createManagedMastodonAccount).not.toHaveBeenCalled();
  });

  it("503 when validator returns reason=instance_unreachable", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: false,
      reason: "instance_unreachable",
      message: "Could not reach the Mastodon instance.",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "Test",
        instanceUrl: "https://mastodon.social",
        accessToken: "any-token",
        visibility: "public",
        isActive: true,
      }),
    });

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Mastodon instance unreachable");
    expect(serviceMocks.createManagedMastodonAccount).not.toHaveBeenCalled();
  });
});

describe("PUT /social-media/mastodon/accounts/:id — token validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 without calling validator when no accessToken in payload", async () => {
    serviceMocks.updateManagedMastodonAccount.mockResolvedValue({
      ok: true,
      data: VALID_ACCOUNT,
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "New Label" }),
    });

    expect(res.status).toBe(200);
    expect(validatorMock.verifyMastodonCredentials).not.toHaveBeenCalled();
  });

  it("200 and validates when accessToken is present in payload", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: true,
      username: "updated_user",
    });
    serviceMocks.updateManagedMastodonAccount.mockResolvedValue({
      ok: true,
      data: VALID_ACCOUNT,
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts/1", {
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

  it("400 when validator returns reason=invalid_token on PUT", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: false,
      reason: "invalid_token",
      message: "The Mastodon instance rejected the access token.",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceUrl: "https://mastodon.social",
        accessToken: "bad-token",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Mastodon rejected the access token");
    expect(serviceMocks.updateManagedMastodonAccount).not.toHaveBeenCalled();
  });

  it("503 when validator returns reason=instance_unreachable on PUT", async () => {
    validatorMock.verifyMastodonCredentials.mockResolvedValue({
      ok: false,
      reason: "instance_unreachable",
      message: "Could not reach the Mastodon instance.",
    });

    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceUrl: "https://mastodon.social",
        accessToken: "any-token",
      }),
    });

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Mastodon instance unreachable");
    expect(serviceMocks.updateManagedMastodonAccount).not.toHaveBeenCalled();
  });

  it("400 when accessToken is present but instanceUrl is missing", async () => {
    const app = makeApp();
    const res = await app.request("/social-media/mastodon/accounts/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: "some-token" }),
    });

    expect(res.status).toBe(400);
    expect(validatorMock.verifyMastodonCredentials).not.toHaveBeenCalled();
    expect(serviceMocks.updateManagedMastodonAccount).not.toHaveBeenCalled();
  });
});
