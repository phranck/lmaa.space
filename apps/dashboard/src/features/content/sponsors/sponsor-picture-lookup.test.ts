import { describe, expect, it } from "vitest";

import {
  canFetchPicture,
  lookupKey,
  shouldFetchPicture,
} from "./sponsor-picture-lookup.ts";

describe("canFetchPicture", () => {
  it("says no when nothing is entered", () => {
    expect(canFetchPicture({})).toBe(false);
  });

  it("says no for a platform nobody can be looked up at", () => {
    expect(canFetchPicture({ website: "https://example.org" })).toBe(false);
  });

  it("says yes for Mastodon and for Bluesky", () => {
    expect(canFetchPicture({ mastodon: "https://oldbytes.space/@lmaa" })).toBe(true);
    expect(canFetchPicture({ bluesky: "https://bsky.app/profile/lmaa.space" })).toBe(true);
  });
});

describe("shouldFetchPicture", () => {
  it("waits while the address is still being typed", () => {
    expect(shouldFetchPicture({ mastodon: "oldbytes" }, "")).toBe(false);
  });

  it("fetches once the address stands as a canonical one", () => {
    expect(shouldFetchPicture({ mastodon: "https://oldbytes.space/@lmaa" }, "")).toBe(true);
  });

  it("does not ask the same question twice", () => {
    const socialMedia = { mastodon: "https://oldbytes.space/@lmaa" };
    expect(shouldFetchPicture(socialMedia, lookupKey(socialMedia))).toBe(false);
  });

  it("asks again once the address changes", () => {
    const before = lookupKey({ mastodon: "https://oldbytes.space/@lmaa" });
    expect(shouldFetchPicture({ mastodon: "https://mastodon.social/@lmaa" }, before)).toBe(true);
  });

  it("ignores a change on a platform nothing can be looked up at", () => {
    expect(shouldFetchPicture({ website: "https://example.org" }, "")).toBe(false);
  });
});

describe("lookupKey", () => {
  it("ignores platforms that carry no lookup", () => {
    expect(lookupKey({ website: "https://example.org" })).toBe("|");
  });

  it("holds both addresses apart", () => {
    expect(
      lookupKey({
        mastodon: "https://oldbytes.space/@lmaa",
        bluesky: "https://bsky.app/profile/lmaa.space",
      }),
    ).toBe("https://oldbytes.space/@lmaa|https://bsky.app/profile/lmaa.space");
  });
});
