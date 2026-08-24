import { describe, expect, it } from "vitest";

import { slugify, slugifyInput } from "./slug.js";

describe("slugify", () => {
  it("writes German letters out rather than dropping them", () => {
    expect(slugify("Über uns")).toBe("ueber-uns");
    expect(slugify("Grüße & Küsse")).toBe("gruesse-kuesse");
    expect(slugify("Straße")).toBe("strasse");
  });

  it("collapses any run of other characters into one hyphen", () => {
    expect(slugify("a - - b")).toBe("a-b");
    expect(slugify("Shops___und___Läden")).toBe("shops-und-laeden");
  });

  it("carries no hyphen at either end", () => {
    expect(slugify("  Über uns  ")).toBe("ueber-uns");
    expect(slugify("--Test--")).toBe("test");
  });

  it("returns nothing when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("-")).toBe("");
  });
});

describe("slugifyInput", () => {
  it("keeps the hyphen somebody has just typed", () => {
    expect(slugifyInput("ueber-")).toBe("ueber-");
    expect(slugifyInput("über-u")).toBe("ueber-u");
  });

  it("still writes German letters out", () => {
    expect(slugifyInput("Grüße")).toBe("gruesse");
  });

  it("turns anything else into a hyphen", () => {
    expect(slugifyInput("a b")).toBe("a-b");
  });
});
