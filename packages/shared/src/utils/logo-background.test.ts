import { describe, expect, it } from "vitest";

import { DEFAULT_LOGO_BACKGROUND, resolveLogoBackground } from "./logo-background.js";

describe("resolveLogoBackground", () => {
  it("returns default for null", () => {
    expect(resolveLogoBackground(null)).toBe(DEFAULT_LOGO_BACKGROUND);
  });

  it("returns default for undefined", () => {
    expect(resolveLogoBackground(undefined)).toBe(DEFAULT_LOGO_BACKGROUND);
  });

  it("returns default for empty string", () => {
    expect(resolveLogoBackground("")).toBe(DEFAULT_LOGO_BACKGROUND);
  });

  it("returns the provided hex value", () => {
    expect(resolveLogoBackground("#ff00aa")).toBe("#ff00aa");
  });

  it("exposes the default constant as stone-50 hex", () => {
    expect(DEFAULT_LOGO_BACKGROUND).toBe("#fafaf9");
  });
});
