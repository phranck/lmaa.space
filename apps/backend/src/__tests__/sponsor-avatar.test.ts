import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPreviewImage } from "../lib/og.js";
import { isPublicFetchTarget } from "../lib/validate.js";
import { resolveSponsorAvatar } from "../services/sponsor-avatar.js";

vi.mock("../lib/validate.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/validate.js")>();
  return { ...actual, isPublicFetchTarget: vi.fn() };
});

vi.mock("../lib/og.js", () => ({ fetchPreviewImage: vi.fn() }));

const publicTarget = vi.mocked(isPublicFetchTarget);
const previewImage = vi.mocked(fetchPreviewImage);

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

    const avatar = await resolveSponsorAvatar([
      { platform: "mastodon", url: "https://oldbytes.space/@lmaa" },
    ]);

    expect(avatar).toBe("https://oldbytes.space/avatar.png");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://oldbytes.space/api/v1/accounts/lookup?acct=lmaa");
  });

  it("takes the animated picture when there is no still one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ avatar: "https://oldbytes.space/a.gif" })),
    );

    const avatar = await resolveSponsorAvatar([
      { platform: "mastodon", url: "https://oldbytes.space/@lmaa" },
    ]);

    expect(avatar).toBe("https://oldbytes.space/a.gif");
  });

  it("asks Bluesky's public API about a handle", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ avatar: "https://cdn.bsky.app/avatar.jpg" }));
    vi.stubGlobal("fetch", fetchMock);

    const avatar = await resolveSponsorAvatar([
      { platform: "bluesky", url: "https://bsky.app/profile/lmaa.space" },
    ]);

    expect(avatar).toBe("https://cdn.bsky.app/avatar.jpg");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=lmaa.space");
  });

  it("refuses a picture that is not a public HTTPS address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ avatar: "http://127.0.0.1/avatar.png" })),
    );

    expect(
      await resolveSponsorAvatar([{ platform: "mastodon", url: "https://oldbytes.space/@lmaa" }]),
    ).toBeNull();
  });

  it("never calls a host the fetch guard rejects", async () => {
    publicTarget.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(
      await resolveSponsorAvatar([{ platform: "mastodon", url: "https://internal.local/@lmaa" }]),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads a page for any service that answers no such question directly", async () => {
    previewImage.mockResolvedValue({ url: "https://example.org/logo.png", via: "og:image" });

    expect(
      await resolveSponsorAvatar([{ platform: "tumblr", url: "https://example.tumblr.com" }]),
    ).toBe("https://example.org/logo.png");
    expect(previewImage).toHaveBeenCalledWith("https://example.tumblr.com", {
      intent: "portrait",
    });
  });

  it("asks a profile for a portrait and a website for its mark", async () => {
    previewImage.mockResolvedValue({ url: "https://example.org/picture.png", via: "og:image" });

    await resolveSponsorAvatar([{ platform: "xing", url: "https://xing.com/profile/somebody" }]);
    expect(previewImage).toHaveBeenCalledWith("https://xing.com/profile/somebody", {
      intent: "portrait",
    });

    previewImage.mockClear();
    await resolveSponsorAvatar([{ platform: "website", url: "https://example.org" }]);
    expect(previewImage).toHaveBeenCalledWith("https://example.org", { intent: "site-mark" });
  });

  it("takes a portrait over a page, and a page over a website's own mark", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ avatar: "https://oldbytes.space/portrait.png" })),
    );
    previewImage.mockResolvedValue({ url: "https://example.org/logo.png", via: "og:image" });

    const avatar = await resolveSponsorAvatar([
      { platform: "website", url: "https://example.org" },
      { platform: "tumblr", url: "https://example.tumblr.com" },
      { platform: "mastodon", url: "https://oldbytes.space/@lmaa" },
    ]);

    expect(avatar).toBe("https://oldbytes.space/portrait.png");
    expect(previewImage).not.toHaveBeenCalled();
  });

  it("falls back to the website only once everything else has been tried", async () => {
    previewImage.mockImplementation(async (url: string) =>
      url === "https://example.org" ? { url: "https://example.org/logo.png", via: "icon" } : null,
    );

    const avatar = await resolveSponsorAvatar([
      { platform: "website", url: "https://example.org" },
      { platform: "tumblr", url: "https://example.tumblr.com" },
    ]);

    expect(avatar).toBe("https://example.org/logo.png");
    expect(previewImage.mock.calls.map(([url]) => url)).toEqual([
      "https://example.tumblr.com",
      "https://example.org",
    ]);
  });

  it("gives nothing when no address yields a picture", async () => {
    previewImage.mockResolvedValue(null);
    expect(
      await resolveSponsorAvatar([{ platform: "website", url: "https://example.org" }]),
    ).toBeNull();
  });
});
