import { describe, expect, it } from "vitest";

import { resolveClientIp } from "../middleware/rate-limit.js";

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

  it("reads the client IP before the configured proxy hops in X-Forwarded-For", () => {
    const headers = new Headers({
      "X-Forwarded-For": "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4",
    });
    expect(resolveClientIp(headers, { trustedHeader: "x-forwarded-for", trustedHops: 2 })).toBe(
      "2.2.2.2",
    );
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
