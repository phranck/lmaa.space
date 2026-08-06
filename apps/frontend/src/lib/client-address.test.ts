import { describe, expect, it } from "vitest";

import { buildForwardedForHeader } from "./client-address";

describe("buildForwardedForHeader", () => {
  // Without this the backend saw no address at all and fell back to a single
  // shared bucket for every website visitor.
  it("forwards an existing header so the backend can read the trusted hop", () => {
    expect(buildForwardedForHeader("203.0.113.7", "10.0.0.1")).toBe("203.0.113.7");
  });

  it("passes a multi-hop chain through unchanged", () => {
    // The right-most entry is the one the edge proxy observed. Appending here
    // would push it out of the position the backend reads.
    expect(buildForwardedForHeader("1.1.1.1, 203.0.113.7", "10.0.0.1")).toBe(
      "1.1.1.1, 203.0.113.7",
    );
  });

  it("does not let the socket address override a forwarded chain", () => {
    expect(buildForwardedForHeader("203.0.113.7", "198.51.100.4")).not.toContain("198.51.100.4");
  });

  it("falls back to the socket address when no header is present", () => {
    expect(buildForwardedForHeader(null, "203.0.113.7")).toBe("203.0.113.7");
  });

  it("trims surrounding whitespace", () => {
    expect(buildForwardedForHeader("  203.0.113.7  ", null)).toBe("203.0.113.7");
  });

  it.each([
    ["both missing", null, null],
    ["both empty", "", ""],
    ["both whitespace", "   ", "   "],
    ["undefined", undefined, undefined],
  ])("returns null when %s", (_label, header, socket) => {
    expect(buildForwardedForHeader(header, socket)).toBeNull();
  });

  it("falls back to the socket address when the header is blank", () => {
    expect(buildForwardedForHeader("   ", "203.0.113.7")).toBe("203.0.113.7");
  });
});
