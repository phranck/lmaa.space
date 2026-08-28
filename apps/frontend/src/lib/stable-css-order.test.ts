import { describe, expect, it } from "vitest";

import { sortCustomPropertyBlocks } from "@/lib/stable-css-order.js";

describe("sortCustomPropertyBlocks", () => {
  it("puts the declarations of a theme block in one order whatever order they arrive in", () => {
    const first = ":root,:host{--spacing:.25rem;--radius-control:.75rem;--fontWeight-medium:500}";
    const second = ":root,:host{--radius-control:.75rem;--fontWeight-medium:500;--spacing:.25rem}";

    expect(sortCustomPropertyBlocks(first)).toBe(sortCustomPropertyBlocks(second));
    expect(sortCustomPropertyBlocks(first)).toBe(
      ":root,:host{--fontWeight-medium:500;--radius-control:.75rem;--spacing:.25rem}",
    );
  });

  it("reaches a block nested inside an at-rule", () => {
    const css = "@supports (a:b){*,:before{--un-scale-y:1;--un-bg-opacity:100%}}";

    expect(sortCustomPropertyBlocks(css)).toBe(
      "@supports (a:b){*,:before{--un-bg-opacity:100%;--un-scale-y:1}}",
    );
  });

  it("keeps a semicolon that belongs to a value", () => {
    const css = ":root{--b:cubic-bezier(0, 0; 1, 1);--a:1}";

    expect(sortCustomPropertyBlocks(css)).toBe(":root{--a:1;--b:cubic-bezier(0, 0; 1, 1)}");
  });

  it("leaves a block alone when a name is declared twice, because the last one decides", () => {
    const css = ":root{--a:2;--b:1;--a:1}";

    expect(sortCustomPropertyBlocks(css)).toBe(css);
  });

  it("leaves ordinary declarations alone", () => {
    const css = ".card{padding:1rem;margin:0}";

    expect(sortCustomPropertyBlocks(css)).toBe(css);
  });

  it("leaves a block alone that mixes a custom property with an ordinary one", () => {
    const css = ".card{--gap:1rem;padding:1rem}";

    expect(sortCustomPropertyBlocks(css)).toBe(css);
  });

  it("returns a stylesheet without blocks unchanged", () => {
    const css = '@charset "utf-8";';

    expect(sortCustomPropertyBlocks(css)).toBe(css);
  });
});
