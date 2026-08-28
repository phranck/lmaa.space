import { afterEach, describe, expect, it, vi } from "vitest";

import {
  detectPlatformFromHost,
  fetchExternalResource,
  isLogoUrl,
  parseImageDimensions,
  withoutSizeConstraints,
} from "../lib/og.js";

// The SSRF guard resolves hostnames before fetching; resolve every test host to
// a fixed public address so redirect handling is exercised without real DNS.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

function buildPng(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(24);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(buf.buffer);
  view.setUint32(8, 13);
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return buf;
}

function buildJpeg(width: number, height: number): Uint8Array {
  // SOI + SOF0 segment (length 17, precision 8, height, width, 3 components, 9 bytes of component data)
  const buf = new Uint8Array(22);
  buf.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
  buf[7] = (height >> 8) & 0xff;
  buf[8] = height & 0xff;
  buf[9] = (width >> 8) & 0xff;
  buf[10] = width & 0xff;
  buf[11] = 3;
  return buf;
}

function buildGif(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(10);
  buf.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);
  buf[6] = width & 0xff;
  buf[7] = (width >> 8) & 0xff;
  buf[8] = height & 0xff;
  buf[9] = (height >> 8) & 0xff;
  return buf;
}

function buildWebPVP8X(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30);
  buf.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], 0);
  buf.set([0x56, 0x50, 0x38, 0x58], 12); // "VP8X"
  const w = width - 1;
  const h = height - 1;
  buf[24] = w & 0xff;
  buf[25] = (w >> 8) & 0xff;
  buf[26] = (w >> 16) & 0xff;
  buf[27] = h & 0xff;
  buf[28] = (h >> 8) & 0xff;
  buf[29] = (h >> 16) & 0xff;
  return buf;
}

describe("parseImageDimensions", () => {
  it("reads PNG IHDR dimensions", () => {
    expect(parseImageDimensions(buildPng(1200, 630))).toEqual({ width: 1200, height: 630 });
    expect(parseImageDimensions(buildPng(64, 64))).toEqual({ width: 64, height: 64 });
  });

  it("reads JPEG SOF0 dimensions", () => {
    expect(parseImageDimensions(buildJpeg(800, 600))).toEqual({ width: 800, height: 600 });
  });

  it("reads GIF logical screen descriptor", () => {
    expect(parseImageDimensions(buildGif(180, 90))).toEqual({ width: 180, height: 90 });
  });

  it("reads WebP VP8X canvas dimensions", () => {
    expect(parseImageDimensions(buildWebPVP8X(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it("returns null for unknown formats", () => {
    expect(parseImageDimensions(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBeNull();
  });

  it("returns null for truncated PNG signatures", () => {
    expect(parseImageDimensions(new Uint8Array([0x89, 0x50, 0x4e]))).toBeNull();
  });
});

describe("isLogoUrl", () => {
  it("recognises the logo keyword in filenames", () => {
    expect(isLogoUrl("https://example.com/Contigo-Logo.png?v=1")).toBe(true);
    expect(isLogoUrl("https://example.com/static/brand-mark.svg")).toBe(true);
    expect(isLogoUrl("https://example.com/img/wordmark.png")).toBe(true);
    expect(isLogoUrl("https://example.com/icons/signet.png")).toBe(true);
  });

  it("recognises typical theme/asset paths", () => {
    expect(isLogoUrl("https://example.com/theme/abc/assets/res/header.png")).toBe(true);
    expect(isLogoUrl("https://example.com/assets/header.png")).toBe(true);
    expect(isLogoUrl("https://example.com/static/header.png")).toBe(true);
    expect(isLogoUrl("https://example.com/templates/main/logo.png")).toBe(true);
    expect(isLogoUrl("https://example.com/skins/default/img.png")).toBe(true);
  });

  it("rejects hero / content URLs", () => {
    expect(isLogoUrl("https://example.com/media/hero-banner.jpg")).toBe(false);
    expect(isLogoUrl("https://example.com/uploads/product-1234.jpg")).toBe(false);
    expect(isLogoUrl("https://example.com/cdn/photo.jpg")).toBe(false);
    expect(isLogoUrl("https://example.com/wp-content/photo.jpg")).toBe(false);
  });

  it("does not mistake substrings for logo keywords", () => {
    expect(isLogoUrl("https://example.com/media/blogposts/cover.jpg")).toBe(false);
    expect(isLogoUrl("https://example.com/media/biological-soap.jpg")).toBe(false);
  });

  it("falls back to substring matching when the URL is malformed", () => {
    expect(isLogoUrl("not-a-url-with-logo.png")).toBe(true);
    expect(isLogoUrl("/theme/foo/bar.png")).toBe(true);
    expect(isLogoUrl("just-a-string")).toBe(false);
  });
});

describe("fetchExternalResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the final URL for a direct external response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalResource("https://example.com", {
      headers: { Accept: "text/html" },
    });

    expect(result?.finalUrl).toBe("https://example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("follows redirects to another external URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/image.png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("img", {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalResource("https://example.com/start", {
      headers: { Accept: "image/*" },
    });

    expect(result?.finalUrl).toBe("https://cdn.example.com/image.png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("blocks redirects to private targets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/internal" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalResource("https://example.com/start", {
      headers: { Accept: "text/html" },
    });

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("detectPlatformFromHost", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Answers the two NodeInfo requests a host is asked: the well-known document
   * that says where the real one lives, and the real one.
   *
   * @param software - What the host reports running, or `null` for a host that
   *   answers nothing.
   */
  function stubNodeinfo(software: string | null) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (software === null) return new Response("nope", { status: 404 });
        if (url.endsWith("/.well-known/nodeinfo")) {
          return Response.json({
            links: [
              {
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
                href: "https://host/n/2.0",
              },
              {
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
                href: "https://host/n/2.1",
              },
            ],
          });
        }
        return Response.json({ software: { name: software, version: "0.12.7" } });
      }),
    );
  }

  it("names the service a host reports running", async () => {
    stubNodeinfo("pixelfed");
    expect(await detectPlatformFromHost("https://pixey.org/somebody")).toBe("pixelfed");
  });

  it("does not care what the operator called the place", async () => {
    // Measured across twelve instances: their names ran from "Pixey" to
    // "FediSnap", whilst every one of them reported `pixelfed` here.
    stubNodeinfo("Pixelfed");
    expect(await detectPlatformFromHost("https://fedisnap.com/somebody")).toBe("pixelfed");
  });

  it("answers for anything else that speaks NodeInfo", async () => {
    stubNodeinfo("mastodon");
    expect(await detectPlatformFromHost("https://oldbytes.space/@somebody")).toBe("mastodon");
  });

  it("names Friendica, which its own addresses cannot say either", async () => {
    // Measured on friend.enby-box.de on 2026-08-24: `software.name` is
    // `friendica`, whilst `/profile/jaddy` looks like a page on any site.
    stubNodeinfo("friendica");
    expect(await detectPlatformFromHost("https://friend.enby-box.de/profile/jaddy")).toBe(
      "friendica",
    );
  });

  it("leaves a host running something unmapped alone", async () => {
    stubNodeinfo("lemmy");
    expect(await detectPlatformFromHost("https://example.org/c/somewhere")).toBeNull();
  });

  it("leaves an ordinary website alone", async () => {
    stubNodeinfo(null);
    expect(await detectPlatformFromHost("https://example.org/somebody")).toBeNull();
  });

  it("refuses what is not an address", async () => {
    stubNodeinfo("pixelfed");
    expect(await detectPlatformFromHost("not an address")).toBeNull();
  });
});

describe("withoutSizeConstraints", () => {
  it("drops the sizing a CDN was asked for, keeping the rest", () => {
    // The shape bestware.com declares: a 200px file requested at 32px, which
    // is what made the probe reject its own logo.
    expect(
      withoutSizeConstraints(
        "https://bestware.com/cdn/shop/files/logo.png?crop=center&height=32&v=1741270148&width=32",
      ),
    ).toBe("https://bestware.com/cdn/shop/files/logo.png?v=1741270148");
  });

  it("keeps a version parameter, since dropping it can change what is served", () => {
    expect(withoutSizeConstraints("https://example.com/a.png?width=64&v=9")).toBe(
      "https://example.com/a.png?v=9",
    );
  });

  it("leaves the question mark off where nothing else remains", () => {
    expect(withoutSizeConstraints("https://example.com/a.png?width=64&height=64")).toBe(
      "https://example.com/a.png",
    );
  });

  it("returns null where there is nothing to strip", () => {
    // A caller enqueues a second candidate only when this says something
    // changed, so an unchanged URL must not come back as a duplicate.
    expect(withoutSizeConstraints("https://example.com/a.png?v=9")).toBeNull();
    expect(withoutSizeConstraints("https://example.com/a.png")).toBeNull();
  });

  it("matches the key regardless of case and ignores unrelated ones", () => {
    expect(withoutSizeConstraints("https://example.com/a.png?WIDTH=64&alt=text")).toBe(
      "https://example.com/a.png?alt=text",
    );
  });

  it("leaves a URL it cannot parse alone", () => {
    expect(withoutSizeConstraints("not a url at all")).toBeNull();
  });
});
