import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The dashboard's own stylesheet, where its tokens are declared.
 *
 * Read from disk rather than imported, because vitest stubs a stylesheet import
 * to an empty string and `?raw` gives the same nothing. A test built on that
 * import passes whatever the file says, which is worse than no test.
 *
 * This file lives outside `src` for that reading: the browser project carries
 * no node types, and the alternative is handing them to every component.
 */
const STYLESHEET = fileURLToPath(new URL("../src/index.css", import.meta.url));

/** A custom property being declared, at the start of its line. */
const DECLARATION = /^\s*(--[a-zA-Z0-9-]+)\s*:/gm;

/** Where each custom property is declared, by line number. */
function declarationsByProperty(): Map<string, number[]> {
  const stylesheet = readFileSync(STYLESHEET, "utf8");
  const found = new Map<string, number[]>();

  for (const match of stylesheet.matchAll(DECLARATION)) {
    const line = stylesheet.slice(0, match.index).split("\n").length;
    found.set(match[1], [...(found.get(match[1]) ?? []), line]);
  }

  return found;
}

describe("dashboard design tokens", () => {
  it("reads the stylesheet it is checking", () => {
    // The check below is empty on an empty file and would then pass for ever.
    expect(declarationsByProperty().size).toBeGreaterThan(50);
  });

  it("declares every token once", () => {
    // Two declarations of one token means the file answers the same question
    // twice, and whoever finds the first has no reason to look for the second.
    // Where they disagree the earlier one is dead and nothing says so; where
    // they agree, one of them gets edited alone eventually.
    const twice = [...declarationsByProperty()]
      .filter(([, lines]) => lines.length > 1)
      .map(([name, lines]) => `${name} on lines ${lines.join(" and ")}`);

    expect(twice).toEqual([]);
  });
});
