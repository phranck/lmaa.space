import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();

vi.mock("@atproto/api", () => {
  class FakeAgent {
    login = loginMock;
  }
  return { AtpAgent: FakeAgent };
});

import { verifyBlueskyCredentials } from "../services/bluesky-account-validator.js";

beforeEach(() => {
  loginMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("verifyBlueskyCredentials", () => {
  it("returns ok with did on successful login", async () => {
    loginMock.mockResolvedValue({ success: true, data: { did: "did:plc:abc" } });

    const result = await verifyBlueskyCredentials("alice.bsky.social", "abcd-efgh-ijkl-mnop");
    expect(result).toEqual({ ok: true, did: "did:plc:abc" });
  });

  it("returns invalid_credentials on 401", async () => {
    const error = Object.assign(new Error("auth failed"), { status: 401 });
    loginMock.mockRejectedValue(error);

    const result = await verifyBlueskyCredentials("alice.bsky.social", "wrong-pass-word-here");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_credentials");
  });

  it("returns service_unreachable on network error", async () => {
    loginMock.mockRejectedValue(new Error("ECONNRESET"));

    const result = await verifyBlueskyCredentials("alice.bsky.social", "abcd-efgh-ijkl-mnop");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("service_unreachable");
  });
});
