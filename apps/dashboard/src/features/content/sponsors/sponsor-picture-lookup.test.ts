import { describe, expect, it } from "vitest";

import { canFetchPicture, lookupKey, shouldFetchPicture } from "./sponsor-picture-lookup.ts";

describe("canFetchPicture", () => {
  it("says no when nothing is entered", () => {
    expect(canFetchPicture({})).toBe(false);
  });

  it("says no when every field is empty", () => {
    expect(canFetchPicture({ mastodon: "", website: "" })).toBe(false);
  });

  it("says yes for any address, whatever service it belongs to", () => {
    expect(canFetchPicture({ mastodon: "https://oldbytes.space/@lmaa" })).toBe(true);
    expect(canFetchPicture({ bluesky: "https://bsky.app/profile/lmaa.space" })).toBe(true);
    expect(canFetchPicture({ xing: "https://xing.com/profile/somebody" })).toBe(true);
    expect(canFetchPicture({ website: "https://example.org" })).toBe(true);
  });
});

describe("shouldFetchPicture", () => {
  it("waits while the address is still being typed", () => {
    expect(shouldFetchPicture({ mastodon: "oldbytes" }, "")).toBe(false);
  });

  it("fetches once the address stands as a canonical one", () => {
    expect(shouldFetchPicture({ mastodon: "https://oldbytes.space/@lmaa" }, "")).toBe(true);
  });

  it("fetches for a service that has no lookup of its own", () => {
    expect(shouldFetchPicture({ xing: "https://xing.com/profile/somebody" }, "")).toBe(true);
  });

  it("fetches for a website, which answers with the site's own mark", () => {
    expect(shouldFetchPicture({ website: "https://example.org" }, "")).toBe(true);
  });

  it("does not ask the same question twice", () => {
    const socialMedia = { mastodon: "https://oldbytes.space/@lmaa" };
    expect(shouldFetchPicture(socialMedia, lookupKey(socialMedia))).toBe(false);
  });

  it("asks again once the address changes", () => {
    const before = lookupKey({ mastodon: "https://oldbytes.space/@lmaa" });
    expect(shouldFetchPicture({ mastodon: "https://mastodon.social/@lmaa" }, before)).toBe(true);
  });

  it("asks again once a second address is added", () => {
    const before = lookupKey({ mastodon: "https://oldbytes.space/@lmaa" });
    expect(
      shouldFetchPicture(
        {
          mastodon: "https://oldbytes.space/@lmaa",
          xing: "https://xing.com/profile/somebody",
        },
        before,
      ),
    ).toBe(true);
  });
});

describe("lookupKey", () => {
  it("leaves empty fields out", () => {
    expect(lookupKey({ website: "https://example.org", mastodon: "" })).toBe(
      "website=https://example.org",
    );
  });

  it("holds the addresses apart and names which is which", () => {
    expect(
      lookupKey({
        mastodon: "https://oldbytes.space/@lmaa",
        bluesky: "https://bsky.app/profile/lmaa.space",
      }),
    ).toBe("bluesky=https://bsky.app/profile/lmaa.space|mastodon=https://oldbytes.space/@lmaa");
  });

  it("does not change when the fields arrive in another order", () => {
    const one = lookupKey({ mastodon: "https://a", xing: "https://b" });
    const other = lookupKey({ xing: "https://b", mastodon: "https://a" });
    expect(one).toBe(other);
  });
});
