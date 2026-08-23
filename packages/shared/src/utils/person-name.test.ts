import { describe, expect, it } from "vitest";

import { fullName } from "./person-name.js";

describe("fullName", () => {
  it("joins both parts with one space", () => {
    expect(fullName("Ada", "Lovelace")).toBe("Ada Lovelace");
  });

  it("leaves no trailing space when the family name is missing", () => {
    expect(fullName("Ada", "")).toBe("Ada");
  });

  it("leaves no leading space when the given name is missing", () => {
    expect(fullName("", "Lovelace")).toBe("Lovelace");
  });

  it("returns nothing when both are empty", () => {
    expect(fullName("", "")).toBe("");
  });

  it("drops surrounding whitespace", () => {
    expect(fullName("  Ada ", " Lovelace  ")).toBe("Ada Lovelace");
  });
});
