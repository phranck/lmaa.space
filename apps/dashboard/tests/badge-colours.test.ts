import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** Every component in the dashboard, as a path. */
const SOURCE = fileURLToPath(new URL("../src", import.meta.url));

/** The `colorClass` prop and whatever was handed to it, literal or expression. */
const COLOR_CLASS = /colorClass=(?:"([^"]*)"|\{([\s\S]*?)\})/g;

/**
 * A colour straight out of the utility framework, such as `bg-emerald-500/10`.
 *
 * A design token is written `bg-[var(--ds-…)]` and never matches this, so what
 * the pattern finds is exactly a value living outside the design system.
 */
const RAW_UTILITY_COLOUR = /\b(?:bg|text)-[a-z]+-\d{2,3}\b/;

/** Every `colorClass` handed to a badge, with the file and line it sits on. */
async function badgeColourArguments(): Promise<{ where: string; value: string }[]> {
  const found: { where: string; value: string }[] = [];

  for await (const path of glob(`${SOURCE}/**/*.tsx`)) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(COLOR_CLASS)) {
      const line = source.slice(0, match.index).split("\n").length;
      found.push({
        where: `${path.slice(SOURCE.length + 1)}:${line}`,
        value: match[1] ?? match[2] ?? "",
      });
    }
  }

  return found;
}

describe("badge colours", () => {
  it("finds the badges it is checking", async () => {
    // The check below is empty on an empty list and would then pass for ever.
    expect((await badgeColourArguments()).length).toBeGreaterThan(10);
  });

  it("never hands a badge a colour from outside the design system", async () => {
    // Every badge colour is a `--ds-badge-*` token, reached through `BADGE_TONES`
    // or through a feature's own map onto it. A utility colour written at the
    // call site cannot be moved when the design moves, because nothing knows
    // how many call sites wrote it.
    const raw = (await badgeColourArguments())
      .filter(({ value }) => RAW_UTILITY_COLOUR.test(value))
      .map(({ where, value }) => `${where}: ${value.trim()}`);

    expect(raw).toEqual([]);
  });
});
