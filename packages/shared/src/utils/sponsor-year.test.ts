import { describe, expect, it } from "vitest";

import { daysLeft, isCurrent } from "./sponsor-year.js";


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
