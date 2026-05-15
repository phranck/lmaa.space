import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyMastodonCredentials } from "../services/mastodon-account-validator.js";

describe("verifyMastodonCredentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HTTP 200 with username → { ok: true, username }", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ username: "lmaa_bot", acct: "lmaa_bot@mastodon.social" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://mastodon.social", "valid-token-xyz");

    expect(result).toEqual({ ok: true, username: "lmaa_bot" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mastodon.social/api/v1/accounts/verify_credentials");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer valid-token-xyz",
    );
  });

  it("HTTP 200 with malformed JSON → instance_unreachable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://example.com", "tok");
    expect(result).toEqual({
      ok: false,
      reason: "instance_unreachable",
      message: expect.any(String),
    });
  });

  it("HTTP 200 with trailing slash in instanceUrl → strips trailing slash", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ username: "bot" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://mastodon.social/", "token");

    expect(result).toEqual({ ok: true, username: "bot" });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mastodon.social/api/v1/accounts/verify_credentials");

    // Double trailing slash is also stripped correctly
    fetchMock.mockClear();
    await verifyMastodonCredentials("https://mastodon.social//", "token");
    const [url2] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url2).toBe("https://mastodon.social/api/v1/accounts/verify_credentials");
  });

  it("HTTP 401 → { ok: false, reason: 'invalid_token' }", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: "The access token is invalid" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://mastodon.social", "bad-token");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_token");
      expect(result.message).toBeTruthy();
    }
  });

  it("HTTP 403 → { ok: false, reason: 'invalid_token' }", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ error: "This action is outside the authorized scopes" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://mastodon.social", "scoped-token");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_token");
    }
  });

  it("HTTP 500 → { ok: false, reason: 'instance_unreachable' }", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://mastodon.social", "any-token");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("instance_unreachable");
    }
  });

  it("network error (fetch throws) → { ok: false, reason: 'instance_unreachable' }", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyMastodonCredentials("https://nonexistent.invalid", "any-token");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("instance_unreachable");
      expect(result.message).toBeTruthy();
    }
  });

  it("does not include the access token in any error message", async () => {
    const sensitiveToken = ["super", "secret", "access", "token", "12345"].join("-");

    // 401 invalid_token path
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result401 = await verifyMastodonCredentials("https://mastodon.social", sensitiveToken);

    expect(result401.ok).toBe(false);
    if (!result401.ok) {
      expect(result401.message).not.toContain(sensitiveToken);
    }

    // network-error path
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const resultNetwork = await verifyMastodonCredentials(
      "https://mastodon.social",
      sensitiveToken,
    );

    expect(resultNetwork.ok).toBe(false);
    if (!resultNetwork.ok) {
      expect(resultNetwork.message).not.toContain(sensitiveToken);
    }
  });
});
