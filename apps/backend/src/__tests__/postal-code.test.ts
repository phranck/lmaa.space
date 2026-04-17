import { describe, expect, it } from "vitest";

import { extractEuropeanPostalCodePrefix } from "../lib/postal-code.js";

describe("extractEuropeanPostalCodePrefix", () => {
  it("returns null for short or empty input", () => {
    expect(extractEuropeanPostalCodePrefix("")).toBeNull();
    expect(extractEuropeanPostalCodePrefix("1")).toBeNull();
    expect(extractEuropeanPostalCodePrefix(" ")).toBeNull();
  });

  it("returns null for plain word queries", () => {
    expect(extractEuropeanPostalCodePrefix("bio")).toBeNull();
    expect(extractEuropeanPostalCodePrefix("fair fashion")).toBeNull();
    expect(extractEuropeanPostalCodePrefix("Berlin")).toBeNull();
  });

  it("recognizes full five-digit German postal codes", () => {
    expect(extractEuropeanPostalCodePrefix("77716")).toBe("77716");
  });

  it("recognizes partial digit prefixes", () => {
    expect(extractEuropeanPostalCodePrefix("77")).toBe("77");
    expect(extractEuropeanPostalCodePrefix("771")).toBe("771");
  });

  it("uppercases and strips whitespace", () => {
    expect(extractEuropeanPostalCodePrefix("  77716 ")).toBe("77716");
    expect(extractEuropeanPostalCodePrefix("sw1a 1aa")).toBe("SW1A1AA");
  });

  it("recognizes Dutch alphanumeric postal codes with embedded spaces", () => {
    expect(extractEuropeanPostalCodePrefix("1234 AB")).toBe("1234AB");
    expect(extractEuropeanPostalCodePrefix("1234")).toBe("1234");
  });

  it("recognizes UK postal codes", () => {
    expect(extractEuropeanPostalCodePrefix("SW1A 1AA")).toBe("SW1A1AA");
    expect(extractEuropeanPostalCodePrefix("SW1")).toBe("SW1");
  });

  it("recognizes Latvian and Lithuanian codes with country prefix", () => {
    expect(extractEuropeanPostalCodePrefix("LV-1050")).toBe("LV1050");
    expect(extractEuropeanPostalCodePrefix("LT01001")).toBe("LT01001");
  });

  it("recognizes Maltese three-letter-plus-digit codes", () => {
    expect(extractEuropeanPostalCodePrefix("VLT 1117")).toBe("VLT1117");
    expect(extractEuropeanPostalCodePrefix("VLT1")).toBe("VLT1");
  });

  it("strips hyphens in multi-part codes", () => {
    expect(extractEuropeanPostalCodePrefix("4050-067")).toBe("4050067");
    expect(extractEuropeanPostalCodePrefix("00-001")).toBe("00001");
  });

  it("rejects alphabetic-only prefixes without digits", () => {
    expect(extractEuropeanPostalCodePrefix("LT")).toBeNull();
    expect(extractEuropeanPostalCodePrefix("VL")).toBeNull();
  });

  it("rejects random alphanumeric input that cannot be a postal code", () => {
    expect(extractEuropeanPostalCodePrefix("abcdef")).toBeNull();
    expect(extractEuropeanPostalCodePrefix("1234567890123")).toBeNull();
  });
});
