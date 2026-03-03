import { describe, expect, it } from "vitest";
import { detectImageType, parseId } from "../lib/validate.js";

describe("parseId", () => {
  it("returns number for valid positive integer", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
    expect(parseId("999999")).toBe(999999);
  });

  it("returns null for zero", () => {
    expect(parseId("0")).toBeNull();
  });

  it("returns null for negative numbers", () => {
    expect(parseId("-1")).toBeNull();
    expect(parseId("-100")).toBeNull();
  });

  it("returns null for floats", () => {
    expect(parseId("1.5")).toBeNull();
    expect(parseId("0.1")).toBeNull();
  });

  it("returns null for non-numeric strings", () => {
    expect(parseId("abc")).toBeNull();
    expect(parseId("")).toBeNull();
    expect(parseId("1abc")).toBeNull();
  });

  it("returns null for special values", () => {
    expect(parseId("NaN")).toBeNull();
    expect(parseId("Infinity")).toBeNull();
  });
});

describe("detectImageType", () => {
  it("detects JPEG by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    expect(detectImageType(buf)).toBe("jpeg");
  });

  it("detects PNG by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x89;
    buf[1] = 0x50;
    buf[2] = 0x4e;
    buf[3] = 0x47;
    expect(detectImageType(buf)).toBe("png");
  });

  it("detects WebP by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x52; // R
    buf[1] = 0x49; // I
    buf[2] = 0x46; // F
    buf[3] = 0x46; // F
    buf[8] = 0x57; // W
    buf[9] = 0x45; // E
    buf[10] = 0x42; // B
    buf[11] = 0x50; // P
    expect(detectImageType(buf)).toBe("webp");
  });

  it("returns null for unknown format", () => {
    const buf = Buffer.alloc(12, 0x00);
    expect(detectImageType(buf)).toBeNull();
  });

  it("returns null for buffer too small", () => {
    const buf = Buffer.alloc(4);
    expect(detectImageType(buf)).toBeNull();
  });
});
