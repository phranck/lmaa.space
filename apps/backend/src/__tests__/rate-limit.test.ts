import { describe, expect, it } from "vitest";

import { matchesInternalToken, resolveClientIp } from "../middleware/rate-limit.js";

describe("resolveClientIp", () => {
  it("reads CF-Connecting-IP when configured", () => {
    const headers = new Headers({
      "CF-Connecting-IP": "1.2.3.4",
      "X-Real-IP": "5.6.7.8",
      "X-Forwarded-For": "9.10.11.12",
    });
    expect(resolveClientIp(headers, { trustedHeader: "cf-connecting-ip", trustedHops: 1 })).toBe(
      "1.2.3.4",
    );
  });

  it("reads X-Real-IP when configured", () => {
    const headers = new Headers({
      "X-Real-IP": "5.6.7.8",
      "X-Forwarded-For": "9.10.11.12",
    });
    expect(resolveClientIp(headers, { trustedHeader: "x-real-ip", trustedHops: 1 })).toBe(
      "5.6.7.8",
    );
  });

  it("takes the right-most X-Forwarded-For entry with a single trusted proxy", () => {
    // The left value is client-supplied (forgeable); the right value is appended
    // by the trusted proxy and is the only one that may be trusted as the peer.
    const headers = new Headers({
      "X-Forwarded-For": "9.9.9.9, 8.8.8.8",
    });
    expect(resolveClientIp(headers, { trustedHeader: "x-forwarded-for", trustedHops: 1 })).toBe(
      "8.8.8.8",
    );
  });

  it("skips the configured number of trusted proxy hops in X-Forwarded-For", () => {
    const headers = new Headers({
      "X-Forwarded-For": "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4",
    });
    expect(resolveClientIp(headers, { trustedHeader: "x-forwarded-for", trustedHops: 2 })).toBe(
      "3.3.3.3",
    );
  });

  it("ignores forged left-most X-Forwarded-For values (spoofing resistance)", () => {
    const forged = new Headers({ "X-Forwarded-For": "127.0.0.1, 203.0.113.7" });
    const honest = new Headers({ "X-Forwarded-For": "203.0.113.7" });
    const config = { trustedHeader: "x-forwarded-for", trustedHops: 1 } as const;
    expect(resolveClientIp(forged, config)).toBe("203.0.113.7");
    expect(resolveClientIp(honest, config)).toBe("203.0.113.7");
  });

  it("trims whitespace from trusted headers", () => {
    const headers = new Headers({
      "CF-Connecting-IP": "  1.2.3.4  ",
    });
    expect(resolveClientIp(headers, { trustedHeader: "cf-connecting-ip", trustedHops: 1 })).toBe(
      "1.2.3.4",
    );
  });

  it("returns 'unknown' when no headers present", () => {
    const headers = new Headers();
    expect(resolveClientIp(headers, { trustedHeader: "x-real-ip", trustedHops: 1 })).toBe(
      "unknown",
    );
  });
});

describe("matchesInternalToken", () => {
  const TOKEN = "internal-token-that-is-long-enough";

  it("accepts the configured token", () => {
    const headers = new Headers({ "x-internal-request": TOKEN });
    expect(matchesInternalToken(headers, TOKEN)).toBe(true);
  });

  // Without a configured token nothing may be exempt, or a missing secret would
  // silently turn into an open bypass of every rate limit.
  it("exempts nothing when no token is configured", () => {
    const headers = new Headers({ "x-internal-request": TOKEN });
    expect(matchesInternalToken(headers, undefined)).toBe(false);
    expect(matchesInternalToken(headers, "")).toBe(false);
  });

  it("rejects a request without the header", () => {
    expect(matchesInternalToken(new Headers(), TOKEN)).toBe(false);
  });

  it.each([
    ["a wrong token of equal length", "internal-token-that-is-different!!"],
    ["a prefix of the token", TOKEN.slice(0, -1)],
    ["the token with something appended", `${TOKEN}x`],
    ["an empty value", ""],
  ])("rejects %s", (_label, value) => {
    const headers = new Headers({ "x-internal-request": value });
    expect(matchesInternalToken(headers, TOKEN)).toBe(false);
  });
});
