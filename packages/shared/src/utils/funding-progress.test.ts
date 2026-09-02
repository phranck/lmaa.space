import { describe, expect, it } from "vitest";

import { fundingProgress } from "./funding-progress.js";

describe("fundingProgress", () => {
  it("reports what is left whilst the year is short", () => {
    expect(fundingProgress(22_600, 9_000)).toEqual({ covered: false, missingCents: 13_600 });
  });

  it("counts the year carried the moment the costs are met exactly", () => {
    expect(fundingProgress(22_600, 22_600)).toEqual({ covered: true, missingCents: 0 });
  });

  it("reports no shortfall for a surplus rather than a negative one", () => {
    expect(fundingProgress(22_600, 30_000)).toEqual({ covered: true, missingCents: 0 });
  });

  it("never calls a year carried whilst nobody has said what it costs", () => {
    // Otherwise a site with no costs entered announces that its year is paid
    // for, which is a claim about a figure that does not exist.
    expect(fundingProgress(0, 0)).toEqual({ covered: false, missingCents: 0 });
    expect(fundingProgress(0, 5_000)).toEqual({ covered: false, missingCents: 0 });
  });
});
