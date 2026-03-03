import { describe, expect, it } from "vitest";
import { resolveClientIp } from "../middleware/rate-limit.js";

describe("resolveClientIp", () => {
  it("prefers CF-Connecting-IP", () => {
    const headers = new Headers({
      "CF-Connecting-IP": "1.2.3.4",
      "X-Real-IP": "5.6.7.8",
      "X-Forwarded-For": "9.10.11.12",
    });
    expect(resolveClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP", () => {
    const headers = new Headers({
      "X-Real-IP": "5.6.7.8",
      "X-Forwarded-For": "9.10.11.12",
    });
    expect(resolveClientIp(headers)).toBe("5.6.7.8");
  });

  it("uses first X-Forwarded-For entry", () => {
    const headers = new Headers({
      "X-Forwarded-For": "1.1.1.1, 2.2.2.2, 3.3.3.3",
    });
    expect(resolveClientIp(headers)).toBe("1.1.1.1");
  });

  it("trims whitespace from headers", () => {
    const headers = new Headers({
      "CF-Connecting-IP": "  1.2.3.4  ",
    });
    expect(resolveClientIp(headers)).toBe("1.2.3.4");
  });

  it("returns 'unknown' when no headers present", () => {
    const headers = new Headers();
    expect(resolveClientIp(headers)).toBe("unknown");
  });
});
