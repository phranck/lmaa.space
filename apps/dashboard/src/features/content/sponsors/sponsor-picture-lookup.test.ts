import { describe, expect, it } from "vitest";

import { canFetchPicture, lookupKey, shouldFetchPicture } from "./sponsor-picture-lookup.ts";

describe("canFetchPicture", () => {
  it("says no when nothing is entered", () => {
    expect(canFetchPicture([])).toBe(false);
  });

  it("says no when every field is empty", () => {
    expect(
      canFetchPicture([
        { platform: "mastodon", url: "" },
        { platform: "website", url: "" },
      ]),
    ).toBe(false);
  });

  it("says yes for any address, whatever service it belongs to", () => {
    expect(canFetchPicture([{ platform: "mastodon", url: "https://oldbytes.space/@lmaa" }])).toBe(
      true,
    );
    expect(
      canFetchPicture([{ platform: "bluesky", url: "https://bsky.app/profile/lmaa.space" }]),
    ).toBe(true);
    expect(canFetchPicture([{ platform: "xing", url: "https://xing.com/profile/somebody" }])).toBe(
      true,
    );
    expect(canFetchPicture([{ platform: "website", url: "https://example.org" }])).toBe(true);
  });
});

describe("shouldFetchPicture", () => {
  it("waits while the address is still being typed", () => {
    expect(shouldFetchPicture([{ platform: "mastodon", url: "oldbytes" }], "")).toBe(false);
  });

  it("fetches once the address stands as a canonical one", () => {
    expect(
      shouldFetchPicture([{ platform: "mastodon", url: "https://oldbytes.space/@lmaa" }], ""),
    ).toBe(true);
  });

  it("fetches for a service that has no lookup of its own", () => {
    expect(
      shouldFetchPicture([{ platform: "xing", url: "https://xing.com/profile/somebody" }], ""),
    ).toBe(true);
  });

  it("fetches for a website, which answers with the site's own mark", () => {
    expect(shouldFetchPicture([{ platform: "website", url: "https://example.org" }], "")).toBe(
      true,
    );
  });

  it("does not ask the same question twice", () => {
    const socialMedia = [{ platform: "mastodon", url: "https://oldbytes.space/@lmaa" }] as const;
    expect(shouldFetchPicture([...socialMedia], lookupKey([...socialMedia]))).toBe(false);
  });

  it("asks again once the address changes", () => {
    const before = lookupKey([{ platform: "mastodon", url: "https://oldbytes.space/@lmaa" }]);
    expect(
      shouldFetchPicture([{ platform: "mastodon", url: "https://mastodon.social/@lmaa" }], before),
    ).toBe(true);
  });

  it("asks again once a second address is added", () => {
    const before = lookupKey([{ platform: "mastodon", url: "https://oldbytes.space/@lmaa" }]);
    expect(
      shouldFetchPicture(
        [
          { platform: "mastodon", url: "https://oldbytes.space/@lmaa" },
          { platform: "xing", url: "https://xing.com/profile/somebody" },
        ],
        before,
      ),
    ).toBe(true);
  });

  it("asks again once a second address of the same kind is added", () => {
    const before = lookupKey([{ platform: "website", url: "https://kim.example" }]);
    expect(
      shouldFetchPicture(
        [
          { platform: "website", url: "https://kim.example" },
          { platform: "website", url: "https://blog.kim.example" },
        ],
        before,
      ),
    ).toBe(true);
  });
});

describe("lookupKey", () => {
  it("leaves empty fields out", () => {
    expect(
      lookupKey([
        { platform: "website", url: "https://example.org" },
        { platform: "mastodon", url: "" },
      ]),
    ).toBe("website=https://example.org");
  });

  it("holds the addresses apart and names which is which", () => {
    expect(
      lookupKey([
        { platform: "mastodon", url: "https://oldbytes.space/@lmaa" },
        { platform: "bluesky", url: "https://bsky.app/profile/lmaa.space" },
      ]),
    ).toBe("mastodon=https://oldbytes.space/@lmaa|bluesky=https://bsky.app/profile/lmaa.space");
  });

  it("changes when the addresses are reordered, because the order decides which is read first", () => {
    const one = lookupKey([
      { platform: "mastodon", url: "https://a" },
      { platform: "xing", url: "https://b" },
    ]);
    const other = lookupKey([
      { platform: "xing", url: "https://b" },
      { platform: "mastodon", url: "https://a" },
    ]);
    expect(one).not.toBe(other);
  });
});
