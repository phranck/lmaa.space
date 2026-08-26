import { beforeEach, describe, expect, it, vi } from "vitest";

import { duotonePaths, loadDuotoneIcons } from "./phosphor-duotone";

describe("loadDuotoneIcons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the two paths a duotone icon is drawn from", async () => {
    await loadDuotoneIcons(["x-circle"]);
    const paths = duotonePaths("x-circle");

    expect(paths).not.toBeNull();
    expect(paths).toHaveLength(2);
    // The second tone is the one carrying an opacity; the other is drawn full.
    expect(paths?.some((path) => path.opacity !== undefined)).toBe(true);
    expect(paths?.some((path) => path.opacity === undefined)).toBe(true);
    for (const path of paths ?? []) expect(path.d.length).toBeGreaterThan(0);
  });

  it("resolves a name of several words", async () => {
    await loadDuotoneIcons(["arrow-square-out"]);
    expect(duotonePaths("arrow-square-out")).not.toBeNull();
  });

  it("answers with nothing for a name that is no icon", async () => {
    await loadDuotoneIcons(["definitely-not-an-icon"]);
    expect(duotonePaths("definitely-not-an-icon")).toBeNull();
  });

  it("refuses a name that could reach outside the icon set", async () => {
    // The name becomes part of a lookup key, so anything but plain words and
    // hyphens is turned away before it gets there.
    await loadDuotoneIcons(["../../etc/passwd", "x circle", "X-Circle!"]);

    expect(duotonePaths("../../etc/passwd")).toBeNull();
    expect(duotonePaths("x circle")).toBeNull();
    expect(duotonePaths("X-Circle!")).toBeNull();
  });

  it("gives nothing for an icon nobody asked for", () => {
    expect(duotonePaths("heart")).toBeNull();
  });
});
