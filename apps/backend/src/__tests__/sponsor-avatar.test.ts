import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isPublicFetchTarget } from "../lib/validate.js";
import { resolveSponsorAvatar } from "../services/sponsor-avatar.js";

vi.mock("../lib/validate.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/validate.js")>();
  return { ...actual, isPublicFetchTarget: vi.fn() };
});

const publicTarget = vi.mocked(isPublicFetchTarget);

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) };
}

describe("resolveSponsorAvatar", () => {
  beforeEach(() => {
    publicTarget.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("asks the sponsor's own Mastodon instance about the account", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ avatar_static: "https://oldbytes.space/avatar.png" }));
    vi.stubGlobal("fetch", fetchMock);

    const avatar = await resolveSponsorAvatar({ mastodon: "https://oldbytes.space/@lmaa" });

    expect(avatar).toBe("https://oldbytes.space/avatar.png");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://oldbytes.space/api/v1/accounts/lookup?acct=lmaa");
  });

  it("takes the animated picture when there is no still one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ avatar: "https://oldbytes.space/a.gif" })),
    );

    const avatar = await resolveSponsorAvatar({ mastodon: "https://oldbytes.space/@lmaa" });

    expect(avatar).toBe("https://oldbytes.space/a.gif");
  });

  it("asks Bluesky's public API about a handle", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ avatar: "https://cdn.bsky.app/avatar.jpg" }));
    vi.stubGlobal("fetch", fetchMock);

    const avatar = await resolveSponsorAvatar({ bluesky: "https://bsky.app/profile/lmaa.space" });

    expect(avatar).toBe("https://cdn.bsky.app/avatar.jpg");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=lmaa.space",
    );
  });

  it("refuses a picture that is not a public HTTPS address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ avatar: "http://127.0.0.1/avatar.png" })),
    );

    expect(await resolveSponsorAvatar({ mastodon: "https://oldbytes.space/@lmaa" })).toBeNull();
  });

  it("never calls a host the fetch guard rejects", async () => {
    publicTarget.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveSponsorAvatar({ mastodon: "https://internal.local/@lmaa" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns nothing for a platform that answers no such question", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveSponsorAvatar({ website: "https://example.org" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
