import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./datetime.js";

/**
 * A moment whose day, month and hour are all one digit, so the padding shows.
 *
 * It is built in local time rather than from a UTC string, because the
 * formatters render in the runner's own zone and a fixed offset would make the
 * expected time depend on where the suite runs.
 */
const MOMENT = new Date(2026, 7, 5, 9, 7, 3);

describe("formatDate", () => {
  it("pads the day and the month", () => {
    expect(formatDate(MOMENT)).toBe("05.08.2026");
  });

  it("writes German unless asked otherwise", () => {
    expect(formatDate(MOMENT, "en")).toBe("08/05/2026");
  });

  it("takes a date, a string or a number", () => {
    expect(formatDate("2026-08-05T09:07:03")).toBe("05.08.2026");
    expect(formatDate(MOMENT.getTime())).toBe("05.08.2026");
  });

  it("returns nothing for a date it cannot read", () => {
    expect(formatDate("not a date")).toBe("");
    expect(formatDate(Number.NaN)).toBe("");
  });
});

describe("formatDateTime", () => {
  it("adds the time to the minute and leaves the seconds out", () => {
    expect(formatDateTime(MOMENT)).toBe("05.08.2026, 09:07");
  });

  it("writes German unless asked otherwise", () => {
    expect(formatDateTime(MOMENT, "en")).toBe("08/05/2026, 09:07 AM");
  });

  it("returns nothing for a date it cannot read", () => {
    expect(formatDateTime("not a date")).toBe("");
  });
});
