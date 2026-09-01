import { describe, expect, it } from "vitest";

import {
  DONATION_MONTH_DAYS,
  SPONSOR_YEAR_DAYS,
  daysLeft,
  isCurrent,
  periodStart,
} from "./sponsor-year.js";

describe("periodStart", () => {
  it("counts today as the whole of a one day window", () => {
    expect(periodStart("2026-09-01", 1)).toBe("2026-09-01");
  });

  it("reaches back one day short of the window, so both ends count", () => {
    expect(periodStart("2026-09-01", DONATION_MONTH_DAYS)).toBe("2026-08-03");
  });

  it("puts the sponsor year a day after the same date a year earlier", () => {
    expect(periodStart("2026-09-01", SPONSOR_YEAR_DAYS)).toBe("2025-09-02");
  });

  it("crosses a leap day without losing one", () => {
    expect(periodStart("2024-03-01", 2)).toBe("2024-02-29");
  });
});


describe("daysLeft", () => {
  it("gives a full year on the day it was paid", () => {
    expect(daysLeft("2026-08-22", "2026-08-22")).toBe(365);
  });

  it("counts down by the day", () => {
    expect(daysLeft("2026-08-22", "2026-08-23")).toBe(364);
  });

  it("still stands on the last day", () => {
    expect(isCurrent("2026-08-22", "2027-08-21")).toBe(true);
  });

  it("has run out a year on", () => {
    expect(daysLeft("2026-08-22", "2027-08-22")).toBe(0);
    expect(isCurrent("2026-08-22", "2027-08-22")).toBe(false);
  });

  it("never counts below zero", () => {
    expect(daysLeft("2020-01-01", "2026-08-22")).toBe(0);
  });
});
