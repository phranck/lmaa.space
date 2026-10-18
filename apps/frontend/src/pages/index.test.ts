import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./index.astro", import.meta.url)), "utf8");

describe("homepage search shortcut", () => {
  it("gives every keycap the same fixed square geometry", () => {
    const style = source.match(/const kbdStyle =\s*\n?\s*"([^"]+)"/)?.[1];

    expect(style).toBeDefined();
    expect(style).toContain("box-sizing:border-box");
    expect(style).toContain("width:24px");
    expect(style).toContain("height:24px");
    expect(style).toContain("padding:0");
  });
});
