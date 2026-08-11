import { describe, expect, it } from "vitest";

import { cacheableSeconds } from "./cache-control";

describe("cacheableSeconds", () => {
  // The values the backend actually sends on the routes rendered on every page.
  it.each([
    ["public, max-age=300, stale-while-revalidate=3600", 300],
    ["public, max-age=60, stale-while-revalidate=300", 60],
    ["public, max-age=60", 60],
  ])("reads %s as %i seconds", (header, expected) => {
    expect(cacheableSeconds(header)).toBe(expected);
  });

  // Shared across every visitor of the server, so anything marked private or
  // uncacheable must never be held.
  it.each([
    ["no-store", "no-store"],
    ["private", "private, max-age=30"],
    ["no-cache", "no-cache, max-age=60"],
  ])("refuses to hold %s", (_label, header) => {
    expect(cacheableSeconds(header)).toBe(0);
  });

  it.each([
    ["a missing header", null],
    ["undefined", undefined],
    ["an empty value", ""],
    ["a header without max-age", "public"],
    ["max-age=0", "public, max-age=0"],
  ])("returns 0 for %s", (_label, header) => {
    expect(cacheableSeconds(header)).toBe(0);
  });

  it("ignores casing", () => {
    expect(cacheableSeconds("PUBLIC, MAX-AGE=120")).toBe(120);
    expect(cacheableSeconds("No-Store")).toBe(0);
  });

  // `stale-while-revalidate` also carries a number; picking that one would hold
  // a response far longer than the endpoint allows.
  it("does not mistake stale-while-revalidate for max-age", () => {
    expect(cacheableSeconds("public, stale-while-revalidate=3600, max-age=60")).toBe(60);
    expect(cacheableSeconds("public, stale-while-revalidate=3600")).toBe(0);
  });
});
