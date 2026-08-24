import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The SSRF guard resolves hostnames before fetching; resolve every test host to
// a fixed public address so nothing here depends on real DNS.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

/** A tiny but real PNG, so what is encoded is an image rather than a string. */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

/**
 * A resolver with an empty cache.
 *
 * The answers are held for hours in module scope, so every test takes its own
 * copy of the module rather than inheriting what the one before it read.
 */
async function freshResolver() {
  vi.resetModules();
  const module = await import("../services/favicon.js");
  return module.resolveFavicon;
}

/**
 * Answers a page and the icons it declares.
 *
 * @param html - What the site's homepage returns.
 * @param icons - Address against what that address answers with, as a content
 *   type and a body. Anything not listed answers 404.
 */
function stubSite(html: string, icons: Record<string, { type: string; body: BodyInit }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      const icon = icons[url];
      if (icon) {
        return new Response(icon.body, { status: 200, headers: { "content-type": icon.type } });
      }
      if (url.endsWith("/")) {
        return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
      }
      return new Response("nope", { status: 404 });
    }),
  );
}

describe("resolveFavicon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the icon a page declares and returns it as data", async () => {
    stubSite('<link rel="icon" href="/mark.png" sizes="64x64">', {
      "https://kim.example/mark.png": { type: "image/png", body: PNG_BYTES },
    });
    const resolveFavicon = await freshResolver();

    const found = await resolveFavicon("https://kim.example");

    expect(found).toBe(`data:image/png;base64,${Buffer.from(PNG_BYTES).toString("base64")}`);
  });

  it("falls back to /favicon.ico, which plenty of sites serve without saying so", async () => {
    stubSite("<html><head></head></html>", {
      "https://kim.example/favicon.ico": { type: "image/x-icon", body: PNG_BYTES },
    });
    const resolveFavicon = await freshResolver();

    expect(await resolveFavicon("https://kim.example")).toContain("data:image/x-icon;base64,");
  });

  it("prefers the smallest icon that is still large enough for the size it is shown at", async () => {
    // The mark travels inside the page, so a 512 pixel one shown at 20 is paid
    // for on every render.
    stubSite(
      `<link rel="icon" href="/tiny.png" sizes="16x16">
       <link rel="icon" href="/right.png" sizes="64x64">
       <link rel="icon" href="/huge.png" sizes="512x512">`,
      {
        "https://kim.example/right.png": { type: "image/png", body: PNG_BYTES },
        "https://kim.example/tiny.png": { type: "image/png", body: PNG_BYTES },
        "https://kim.example/huge.png": { type: "image/png", body: PNG_BYTES },
      },
    );
    const resolveFavicon = await freshResolver();
    await resolveFavicon("https://kim.example");

    const asked = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(asked).toContain("https://kim.example/right.png");
    expect(asked).not.toContain("https://kim.example/tiny.png");
    expect(asked).not.toContain("https://kim.example/huge.png");
  });

  it("takes the largest on offer where a site declares nothing big enough", async () => {
    stubSite(
      `<link rel="icon" href="/tiny.png" sizes="16x16">
       <link rel="icon" href="/small.png" sizes="32x32">`,
      {
        "https://kim.example/small.png": { type: "image/png", body: PNG_BYTES },
        "https://kim.example/tiny.png": { type: "image/png", body: PNG_BYTES },
      },
    );
    const resolveFavicon = await freshResolver();
    await resolveFavicon("https://kim.example");

    const asked = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(asked).toContain("https://kim.example/small.png");
    expect(asked).not.toContain("https://kim.example/tiny.png");
  });

  it("refuses what is not an image, whatever the link claimed", async () => {
    stubSite('<link rel="icon" href="/mark.png">', {
      "https://kim.example/mark.png": { type: "text/html", body: "<html>gotcha</html>" },
      "https://kim.example/favicon.ico": { type: "text/html", body: "<html>gotcha</html>" },
    });
    const resolveFavicon = await freshResolver();

    expect(await resolveFavicon("https://kim.example")).toBeNull();
  });

  it("refuses an icon too large to carry inside a page", async () => {
    stubSite('<link rel="icon" href="/huge.png">', {
      "https://kim.example/huge.png": {
        type: "image/png",
        body: new Uint8Array(200 * 1024),
      },
    });
    const resolveFavicon = await freshResolver();

    expect(await resolveFavicon("https://kim.example")).toBeNull();
  });

  it("gives nothing for a site with no icon at all", async () => {
    stubSite("<html><head></head></html>", {});
    const resolveFavicon = await freshResolver();

    expect(await resolveFavicon("https://kim.example")).toBeNull();
  });

  it("asks a site once, however many addresses on it are looked up", async () => {
    stubSite('<link rel="icon" href="/mark.png" sizes="64x64">', {
      "https://kim.example/mark.png": { type: "image/png", body: PNG_BYTES },
    });
    const resolveFavicon = await freshResolver();

    await resolveFavicon("https://kim.example");
    const afterFirst = vi.mocked(fetch).mock.calls.length;
    await resolveFavicon("https://kim.example/laden");

    expect(vi.mocked(fetch).mock.calls.length).toBe(afterFirst);
  });

  it("remembers that a site has none, so it is not asked again either", async () => {
    stubSite("<html><head></head></html>", {});
    const resolveFavicon = await freshResolver();

    await resolveFavicon("https://kim.example");
    const afterFirst = vi.mocked(fetch).mock.calls.length;
    await resolveFavicon("https://kim.example");

    expect(vi.mocked(fetch).mock.calls.length).toBe(afterFirst);
  });
});
