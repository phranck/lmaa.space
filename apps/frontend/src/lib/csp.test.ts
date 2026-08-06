import { describe, expect, it } from "vitest";

import { withFrameAncestors } from "./csp";

const ASTRO_POLICY =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
  "form-action 'self'; script-src 'self' 'sha256-abc='; style-src 'self' 'sha256-def='";

/** Extracts one directive from a policy string. */
function directive(policy: string, name: string): string {
  const found = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  return found ?? "";
}

describe("withFrameAncestors", () => {
  it("replaces the configured value with the given origin", () => {
    const result = withFrameAncestors(ASTRO_POLICY, "https://dashboard.lmaa.space");
    expect(directive(result, "frame-ancestors")).toBe(
      "frame-ancestors https://dashboard.lmaa.space",
    );
  });

  it("leaves every other directive untouched", () => {
    const result = withFrameAncestors(ASTRO_POLICY, "https://dashboard.lmaa.space");
    for (const name of ["default-src", "base-uri", "object-src", "form-action", "style-src"]) {
      expect(directive(result, name)).toBe(directive(ASTRO_POLICY, name));
    }
  });

  // The hashes are what replaced 'unsafe-inline'. Dropping them while rewriting
  // would block every inline script on the framed page.
  it("keeps the script hashes", () => {
    const result = withFrameAncestors(ASTRO_POLICY, "https://dashboard.lmaa.space");
    expect(directive(result, "script-src")).toBe("script-src 'self' 'sha256-abc='");
  });

  it("adds the directive when the policy has none", () => {
    const result = withFrameAncestors("default-src 'self'", "https://dashboard.lmaa.space");
    expect(directive(result, "frame-ancestors")).toBe(
      "frame-ancestors https://dashboard.lmaa.space",
    );
    expect(directive(result, "default-src")).toBe("default-src 'self'");
  });

  it("never reintroduces unsafe-inline", () => {
    const result = withFrameAncestors(ASTRO_POLICY, "https://dashboard.lmaa.space");
    expect(result).not.toContain("unsafe-inline");
  });
});
