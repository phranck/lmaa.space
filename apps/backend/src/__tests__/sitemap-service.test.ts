import { describe, expect, it } from "vitest";

import { renderSitemapXml } from "../services/sitemap.js";

describe("renderSitemapXml", () => {
  it("includes canonical shop slugs and no legacy token URL", () => {
    const xml = renderSitemapXml(
      [],
      [{ slug: "ma-oldtimer", updatedAt: "2026-10-18T10:00:00.000Z" }],
      "2026-10-18",
    );

    expect(xml).toContain("<loc>https://lmaa.space/shop/ma-oldtimer</loc>");
    expect(xml).not.toContain("nrqimu18");
    expect(xml).toContain("<lastmod>2026-10-18</lastmod>");
  });
});
