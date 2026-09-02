import { describe, expect, it } from "vitest";

import { donationBucketFor } from "@lmaa/contracts";

import {
  DONATION_CHART_PRESETS,
  presetForWindow,
  windowForPreset,
} from "./donation-chart-window.ts";

const TODAY = "2026-09-02";

describe("windowForPreset", () => {
  it("counts a month back as the ledger page counts it", () => {
    expect(windowForPreset("month", TODAY)).toEqual({ from: "2026-08-04", to: TODAY });
  });

  it("counts a year back as a sponsorship runs", () => {
    expect(windowForPreset("year", TODAY)).toEqual({ from: "2025-09-03", to: TODAY });
  });

  it("starts the calendar year on the first of January, not a year back", () => {
    expect(windowForPreset("thisYear", TODAY)).toEqual({ from: "2026-01-01", to: TODAY });
  });

  it("gives the calendar year two days on the second of January", () => {
    expect(windowForPreset("thisYear", "2026-01-02")).toEqual({
      from: "2026-01-01",
      to: "2026-01-02",
    });
  });

  it("leaves both ends open for everything, so the ledger decides the reach", () => {
    expect(windowForPreset("all", TODAY)).toEqual({});
  });
});

describe("the presets against the period size the route derives", () => {
  // The page offers a short window and a long one. Which of them the route
  // draws by day is not the page's decision, so this pins that the two shorter
  // presets land on daily bars and the longer ones do not.
  it("draws the month and the quarter by day", () => {
    for (const preset of ["month", "quarter"] as const) {
      const window = windowForPreset(preset, TODAY);
      expect(donationBucketFor(window.from, window.to)).toBe("day");
    }
  });

  it("draws the year and everything by month", () => {
    for (const preset of ["year", "all"] as const) {
      const window = windowForPreset(preset, TODAY);
      expect(donationBucketFor(window.from, window.to)).toBe("month");
    }
  });

  it("draws the calendar year by whichever size its length has reached", () => {
    // The one preset whose length changes through the year, so it crosses from
    // daily bars to monthly ones somewhere around the start of April.
    const inSeptember = windowForPreset("thisYear", TODAY);
    expect(donationBucketFor(inSeptember.from, inSeptember.to)).toBe("month");

    const inFebruary = windowForPreset("thisYear", "2026-02-10");
    expect(donationBucketFor(inFebruary.from, inFebruary.to)).toBe("day");
  });
});

describe("presetForWindow", () => {
  it("recognises every preset it produced itself", () => {
    for (const preset of DONATION_CHART_PRESETS) {
      expect(presetForWindow(windowForPreset(preset, TODAY), TODAY)).toBe(preset);
    }
  });

  it("recognises no preset for a window somebody typed", () => {
    expect(presetForWindow({ from: "2026-03-14", to: "2026-04-01" }, TODAY)).toBeNull();
  });

  it("recognises no preset for a half-open window", () => {
    expect(presetForWindow({ from: "2026-08-04" }, TODAY)).toBeNull();
  });

  it("takes the first of two presets describing the same window", () => {
    // On the thirtieth of January the last thirty days and the calendar year
    // both begin on the first, so the two ask for identical data. Whichever is
    // shown as chosen draws the same page.
    const thirtiethOfJanuary = "2026-01-30";
    expect(windowForPreset("month", thirtiethOfJanuary)).toEqual(
      windowForPreset("thisYear", thirtiethOfJanuary),
    );
    expect(
      presetForWindow(windowForPreset("thisYear", thirtiethOfJanuary), thirtiethOfJanuary),
    ).toBe("month");
  });
});
