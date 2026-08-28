import { afterEach, describe, expect, it, vi } from "vitest";

import {
  detectPlatformFromHost,
  documentBase,
  fetchPreviewImage,
  inspectImageUrl,
  inspectImageUrlDetailed,
  isMastheadImage,
  fetchExternalResource,
  isLogoUrl,
  secureImageUrl,
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

describe("inspectImageUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("recognises a readable image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(buildPng(180, 180).buffer as ArrayBuffer, {
          status: 206,
          headers: { "content-type": "image/png" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/logo.png")).resolves.toBe("valid");
  });

  it("does not reject a valid image because the complete file exceeds 64 KB", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(buildPng(1200, 630).buffer as ArrayBuffer, {
          status: 200,
          headers: {
            "content-type": "image/png",
            "content-length": "1048576",
          },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/large-logo.png")).resolves.toBe("valid");
  });

  it("recognises an ICO image", async () => {
    const ico = new Uint8Array([0, 0, 1, 0, 1, 0, 16, 16, 0, 0]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(ico.buffer as ArrayBuffer, {
          status: 206,
          headers: { "content-type": "image/x-icon" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/favicon.ico")).resolves.toBe("valid");
  });

  it("retries without a range when the server rejects range requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 416 }))
      .mockResolvedValueOnce(
        new Response(buildPng(180, 180).buffer as ArrayBuffer, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(inspectImageUrl("https://example.com/logo.png")).resolves.toBe("valid");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.not.objectContaining({ Range: expect.anything() }),
      }),
    );
  });

  it.each([404, 410])("recognises HTTP %s as broken", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status })));

    await expect(inspectImageUrl("https://example.com/logo.png")).resolves.toBe("broken");
  });

  it("recognises a non-image response as broken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>not an image</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/logo.png")).resolves.toBe("broken");
  });

  it("recognises malformed data in a supported image format as broken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not a png", {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/logo.png")).resolves.toBe("broken");
  });

  it("does not call an unsupported image format broken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("validity cannot be decided from this prefix", {
          status: 200,
          headers: { "content-type": "image/avif" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/logo.avif")).resolves.toBe("unreachable");
  });

  it("recognises an SVG without explicit dimensions as readable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>', {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/logo.svg")).resolves.toBe("valid");
  });

  it("does not call unknown data without a content type broken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("unknown image data", {
          headers: { "content-type": "" },
        }),
      ),
    );

    await expect(inspectImageUrl("https://example.com/logo")).resolves.toBe("unreachable");
  });

  it("does not call a temporary fetch failure broken", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("temporary network failure")));

    await expect(inspectImageUrl("https://example.com/logo.png")).resolves.toBe("unreachable");
  });

  it("reports the HTTP status and attempt count for an inconclusive response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("forbidden", {
          status: 403,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    await expect(
      inspectImageUrlDetailed("https://example.com/logo.png", { attempts: 3, retryDelayMs: 0 }),
    ).resolves.toEqual({
      status: "unreachable",
      reason: "HTTP 403 after 3 attempts",
      attempts: 3,
      httpStatus: 403,
    });
  });

  it("reports an escaped query URL as definitively broken", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      inspectImageUrlDetailed("https://example.com/logo.png?w=512&amp;q=80"),
    ).resolves.toEqual({
      status: "broken",
      reason: "URL contains escaped HTML entities",
      attempts: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an expired signed URL as definitively broken", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));

    await expect(
      inspectImageUrlDetailed("https://cdn.example.com/logo.png?Expires=1780656536"),
    ).resolves.toEqual({
      status: "broken",
      reason: "signed URL expired on 2026-06-05T10:48:56.000Z",
      attempts: 0,
    });
    vi.useRealTimers();
  });
});

describe("isLogoUrl", () => {
  it("recognises the logo keyword in filenames", () => {
    expect(isLogoUrl("https://example.com/Contigo-Logo.png?v=1")).toBe(true);
    expect(isLogoUrl("https://example.com/static/brand-mark.svg")).toBe(true);
    expect(isLogoUrl("https://example.com/img/wordmark.png")).toBe(true);
    expect(isLogoUrl("https://example.com/icons/signet.png")).toBe(true);
  });

  it("recognises explicit logo names inside theme paths", () => {
    expect(isLogoUrl("https://example.com/theme/abc/assets/res/header-logo.png")).toBe(true);
    expect(isLogoUrl("https://example.com/templates/main/logo.png")).toBe(true);
    expect(isLogoUrl("https://example.com/skins/default/brand-mark.png")).toBe(true);
  });

  it("does not call generic theme, asset, or static images logos", () => {
    expect(isLogoUrl("https://example.com/theme/abc/assets/res/header.png")).toBe(false);
    expect(isLogoUrl("https://example.com/skins/default/ssl-widget.svg")).toBe(false);
    expect(isLogoUrl("https://example.com/assets/trustpilot_banner.png")).toBe(false);
    expect(isLogoUrl("https://example.com/static/summer-sale.jpg")).toBe(false);
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
    expect(isLogoUrl("/theme/foo/bar.png")).toBe(false);
    expect(isLogoUrl("just-a-string")).toBe(false);
  });
});

describe("fetchPreviewImage site marks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prefers a conventional icon over a product sharing image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === "https://shop.example/") {
          return new Response('<meta property="og:image" content="/product.jpg">', {
            headers: { "content-type": "text/html" },
          });
        }
        if (url === "https://shop.example/product.jpg") {
          return new Response(buildJpeg(1200, 630).buffer as ArrayBuffer, {
            headers: { "content-type": "image/jpeg" },
          });
        }
        if (url === "https://shop.example/apple-touch-icon.png") {
          return new Response(buildPng(180, 180).buffer as ArrayBuffer, {
            headers: { "content-type": "image/png" },
          });
        }
        return new Response("missing", { status: 404 });
      }),
    );

    await expect(
      fetchPreviewImage("https://shop.example/", { intent: "site-mark" }),
    ).resolves.toEqual({
      url: "https://shop.example/apple-touch-icon.png",
      via: "well-known",
    });
  });

  it("uses an explicit SVG logo instead of a product image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === "https://shop.example/") {
          return new Response(
            '<meta property="og:image" content="/product.jpg"><img src="/brand-logo.svg">',
            { headers: { "content-type": "text/html" } },
          );
        }
        if (url === "https://shop.example/product.jpg") {
          return new Response(buildJpeg(1200, 630).buffer as ArrayBuffer, {
            headers: { "content-type": "image/jpeg" },
          });
        }
        if (url === "https://shop.example/brand-logo.svg") {
          return new Response('<svg viewBox="0 0 480 120"></svg>', {
            headers: { "content-type": "image/svg+xml" },
          });
        }
        return new Response("missing", { status: 404 });
      }),
    );

    await expect(
      fetchPreviewImage("https://shop.example/", { intent: "site-mark" }),
    ).resolves.toEqual({
      url: "https://shop.example/brand-logo.svg",
      via: "header-logo",
    });
  });

  it("stores an icon declared over http at its protected address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === "https://shop.example/") {
          return new Response('<link rel="icon" href="http://shop.example/logo.png">', {
            headers: { "content-type": "text/html" },
          });
        }
        if (url === "https://shop.example/logo.png") {
          return new Response(buildPng(200, 200).buffer as ArrayBuffer, {
            headers: { "content-type": "image/png" },
          });
        }
        return new Response("missing", { status: 404 });
      }),
    );

    await expect(
      fetchPreviewImage("https://shop.example/", { intent: "site-mark" }),
    ).resolves.toEqual({
      url: "https://shop.example/logo.png",
      via: "icon",
    });
  });

  it("returns nothing rather than using an unmarked product image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === "https://shop.example/") {
          return new Response(
            '<meta property="og:image" content="/product.jpg"><img src="/summer-shirt.jpg">',
            { headers: { "content-type": "text/html" } },
          );
        }
        if (url.endsWith(".jpg")) {
          return new Response(buildJpeg(1200, 630).buffer as ArrayBuffer, {
            headers: { "content-type": "image/jpeg" },
          });
        }
        return new Response("missing", { status: 404 });
      }),
    );

    await expect(
      fetchPreviewImage("https://shop.example/", { intent: "site-mark" }),
    ).resolves.toBeNull();
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

  it("turns an asynchronous network rejection into no result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(
      fetchExternalResource("https://example.com/image.png", {
        headers: { Accept: "image/*" },
      }),
    ).resolves.toBeNull();
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

describe("secureImageUrl", () => {
  it("raises an unprotected address to the protected one", () => {
    expect(secureImageUrl("http://www.arktis.de/cdn/shop/files/logo.png")).toBe(
      "https://www.arktis.de/cdn/shop/files/logo.png",
    );
  });

  it("keeps the port, the path and the query", () => {
    expect(secureImageUrl("http://example.com:8080/a/b.png?v=1")).toBe(
      "https://example.com:8080/a/b.png?v=1",
    );
  });

  it("leaves anything that is not http alone", () => {
    expect(secureImageUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(secureImageUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(secureImageUrl("not a url")).toBe("not a url");
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

describe("documentBase", () => {
  it("follows a base tag, which is what the browser resolves against", () => {
    // icomp.de: a Contao storefront serving /index.php/en/news.html while its
    // assets hang off the root. Resolving against the document URL turned every
    // relative path into a 404.
    expect(
      documentBase(
        '<head><base href="https://shop.icomp.de/"><title>x</title></head>',
        "https://shop.icomp.de/index.php/en/news.html",
      ),
    ).toBe("https://shop.icomp.de/");
  });

  it("resolves a relative base against the document", () => {
    expect(documentBase('<base href="/shop/">', "https://example.com/a/b.html")).toBe(
      "https://example.com/shop/",
    );
  });

  it("keeps the document URL where there is no base tag", () => {
    expect(documentBase("<head><title>x</title></head>", "https://example.com/a/b.html")).toBe(
      "https://example.com/a/b.html",
    );
  });

  it("ignores a base tag without a usable href", () => {
    expect(documentBase('<base target="_blank">', "https://example.com/a")).toBe(
      "https://example.com/a",
    );
    expect(documentBase('<base href="">', "https://example.com/a")).toBe("https://example.com/a");
  });

  it("takes the first base tag, as a browser does", () => {
    expect(
      documentBase(
        '<base href="https://a.example/"><base href="https://b.example/">',
        "https://c.example/",
      ),
    ).toBe("https://a.example/");
  });

  it("resolves an odd href the way a browser would, rather than refusing it", () => {
    // Almost nothing fails to parse against a valid document URL, and a browser
    // treats what is left as a relative path. Matching that is the point: this
    // has to agree with what the page itself resolves to.
    expect(documentBase('<base href="::odd">', "https://example.com/a")).toBe(
      "https://example.com/::odd",
    );
  });
});

describe("isMastheadImage", () => {
  it("counts pictures, not bytes, where no header element says otherwise", () => {
    // The measurement that overturned the first attempt: bestware.com carries
    // 81 KB of markup before its wordmark, which any byte threshold rejects,
    // while the wordmark is still the very first picture on the page.
    const html = "<html>" + "x".repeat(90000) + "<img src=logo.png>";
    expect(isMastheadImage(html, 0, 90006)).toBe(true);
  });

  it("stops after the third picture", () => {
    const html = "<html><img><img><img><img>";
    expect(isMastheadImage(html, 2, 20)).toBe(true);
    expect(isMastheadImage(html, 3, 25)).toBe(false);
  });

  it("obeys a header element where the page has one", () => {
    const html = "<header><img src=a></header>" + "y".repeat(100) + "<img src=b>";
    const ende = html.indexOf("</header>");
    expect(isMastheadImage(html, 0, ende - 5)).toBe(true);
    // Past the masthead, position decides and the count no longer helps.
    expect(isMastheadImage(html, 1, ende + 50)).toBe(false);
  });
});

describe("isLogoUrl", () => {
  const trifft = [
    "https://x.de/icomp_logo-2x.png",
    "https://x.de/NUI_Logo_Gruen_RGB.png",
    "https://x.de/logo-desktop.png",
    "https://x.de/bestware_Nav_Logo_800px_DE.png",
    // Run together in camel case, which a separator-based rule misses although
    // the word is plainly there. kiddicraft-bricks.de names its logo this way.
    "https://x.de/KiddicraftLogo1000head-1920w.png",
    "https://x.de/ShopBrandMark.svg",
  ];
  const trifftNicht = [
    // "logo" sits inside these, and neither is a mark.
    "https://x.de/icons/logout-arrow.svg",
    "https://x.de/img/logout.png",
    "https://x.de/catalogue-cover.jpg",
    "https://x.de/produkt-1234.jpg",
  ];

  it.each(trifft)("reads %s as a logo", (url) => {
    expect(isLogoUrl(url)).toBe(true);
  });

  it.each(trifftNicht)("does not read %s as a logo", (url) => {
    expect(isLogoUrl(url)).toBe(false);
  });
});
