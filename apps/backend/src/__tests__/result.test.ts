import { describe, expect, it } from "vitest";
import { failure, success } from "../lib/result.js";

describe("success", () => {
  it("returns ok: true without data", () => {
    const result = success();
    expect(result.ok).toBe(true);
  });

  it("returns ok: true with data", () => {
    const result = success({ user: { id: 1, name: "test" } });
    expect(result.ok).toBe(true);
    expect(result.user).toEqual({ id: 1, name: "test" });
  });

  it("spreads multiple data properties", () => {
    const result = success({ message: "done", count: 42 });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("done");
    expect(result.count).toBe(42);
  });
});

describe("failure", () => {
  it("returns ok: false with reason", () => {
    const result = failure("not_found");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
  });

  it("preserves exact reason string", () => {
    const result = failure("invalid_credentials");
    expect(result.reason).toBe("invalid_credentials");
  });
});

describe("discriminated union", () => {
  it("narrows correctly in conditional", () => {
    const result: ReturnType<typeof success> | ReturnType<typeof failure> =
      Math.random() > 0.5 ? success({ data: "test" }) : failure("error");

    if (result.ok) {
      expect(result.ok).toBe(true);
    } else {
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    }
  });
});
