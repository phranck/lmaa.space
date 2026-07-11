import { describe, expect, it } from "vitest";

import { getSafeActionUrl } from "./safe-url";

describe("getSafeActionUrl", () => {
  it("preserves root-relative shop links", () => {
    expect(getSafeActionUrl("/shop/bi1k8tha")).toBe("/shop/bi1k8tha");
  });

  it("rejects scheme-relative external links", () => {
    expect(getSafeActionUrl("//evil.example/shop/bi1k8tha")).toBeNull();
  });
});
