import { describe, expect, it } from "vitest";

import { WEBSITE_CONTENT_SECURITY_POLICY, buildFooterPreviewCsp } from "./csp";

/** Extracts one directive from a policy string. */
function directive(policy: string, name: string): string {
  const found = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  return found ?? "";
}

/**
 * Package CDNs serve any package to anyone, so allowing one as a script source
 * means any injection can pull in arbitrary code.
 */
const PACKAGE_CDNS = [
  "unpkg.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "esm.sh",
  "skypack.dev",
];

describe("website CSP", () => {
  it.each(PACKAGE_CDNS)("does not allow scripts from %s", (host) => {
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "script-src")).not.toContain(host);
  });

  it.each(PACKAGE_CDNS)("does not allow styles from %s", (host) => {
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "style-src")).not.toContain(host);
  });

  it("allows scripts only from the site itself and the analytics origin", () => {
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "script-src")).toBe(
      "script-src 'self' 'unsafe-inline' https://umami.layered.work",
    );
  });

  it("keeps the directives that bound the damage of an injection", () => {
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "object-src")).toBe("object-src 'none'");
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "base-uri")).toBe("base-uri 'self'");
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "frame-ancestors")).toBe(
      "frame-ancestors 'none'",
    );
    expect(directive(WEBSITE_CONTENT_SECURITY_POLICY, "form-action")).toBe("form-action 'self'");
  });
});

describe("buildFooterPreviewCsp", () => {
  it("lets only the given dashboard origin frame the preview", () => {
    const policy = buildFooterPreviewCsp("https://dashboard.lmaa.space");
    expect(directive(policy, "frame-ancestors")).toBe(
      "frame-ancestors https://dashboard.lmaa.space",
    );
  });

  it.each(PACKAGE_CDNS)("does not allow scripts from %s", (host) => {
    const policy = buildFooterPreviewCsp("https://dashboard.lmaa.space");
    expect(directive(policy, "script-src")).not.toContain(host);
  });

  it("matches the website policy apart from frame-ancestors", () => {
    const policy = buildFooterPreviewCsp("https://dashboard.lmaa.space");
    for (const name of ["script-src", "style-src", "connect-src", "form-action", "object-src"]) {
      expect(directive(policy, name)).toBe(directive(WEBSITE_CONTENT_SECURITY_POLICY, name));
    }
  });
});
