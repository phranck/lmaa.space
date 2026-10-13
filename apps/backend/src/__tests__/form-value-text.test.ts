import { describe, expect, it } from "vitest";

import { formValueToText } from "../lib/form-value-text.js";

describe("formValueToText", () => {
  it("leaves text as it is", () => {
    expect(formValueToText("Wien")).toBe("Wien");
  });

  it("writes numbers and booleans out", () => {
    expect(formValueToText(42)).toBe("42");
    expect(formValueToText(false)).toBe("false");
  });

  it("turns a missing value into an empty string", () => {
    expect(formValueToText(null)).toBe("");
    expect(formValueToText(undefined)).toBe("");
  });

  it("joins the choices of a multi-choice field with a comma and a space", () => {
    expect(formValueToText(["AT", "DE", 3])).toBe("AT, DE, 3");
  });

  it("writes an object as JSON rather than as [object Object]", () => {
    expect(formValueToText({ street: "Kaiserstraße 1", city: "Bregenz" })).toBe(
      '{"street":"Kaiserstraße 1","city":"Bregenz"}',
    );
  });
});
