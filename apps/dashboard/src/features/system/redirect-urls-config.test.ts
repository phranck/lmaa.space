import { describe, expect, it } from "vitest";

import { parseRedirectUrlsConfig } from "./redirect-urls-config.ts";

describe("parseRedirectUrlsConfig", () => {
  it("reads the rules the setting holds", () => {
    const raw = JSON.stringify({
      redirects: [
        { id: "a", name: "shop", targetUrl: "https://beispiel.de", isActive: true },
        { id: "b", name: "blog", targetUrl: "https://beispiel.de/blog", isActive: false },
      ],
    });

    expect(parseRedirectUrlsConfig(raw).redirects).toHaveLength(2);
  });

  it("counts nothing where the setting has never been saved", () => {
    expect(parseRedirectUrlsConfig(undefined).redirects).toEqual([]);
  });

  it("counts nothing when an entry misses what the schema demands", () => {
    // The whole setting is refused rather than the offending entry skipped, so
    // the sidebar shows nothing where the page can edit nothing.
    const raw = JSON.stringify({
      redirects: [{ name: "ohne-id", targetUrl: "https://beispiel.de" }],
    });

    expect(parseRedirectUrlsConfig(raw).redirects).toEqual([]);
  });

  it("counts nothing rather than throwing on unusable content", () => {
    // The sidebar counts what the page lists. Were this to throw, a malformed
    // setting would take down the whole navigation rather than one page.
    expect(parseRedirectUrlsConfig("{nicht: json").redirects).toEqual([]);
    expect(parseRedirectUrlsConfig('{"redirects":"kein array"}').redirects).toEqual([]);
  });
});
