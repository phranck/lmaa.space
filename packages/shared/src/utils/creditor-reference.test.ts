import { describe, expect, it } from "vitest";

import {
  buildCreditorReference,
  creditorReferenceBody,
  formatCreditorReference,
  isValidCreditorReference,
  randomReferenceBody,
} from "./creditor-reference.js";

describe("buildCreditorReference", () => {
  it("reproduces the reference printed in EPC069-12 v3.1", () => {
    expect(buildCreditorReference("539007547034")).toBe("RF18539007547034");
  });

  it("keeps the body it was given", () => {
    expect(buildCreditorReference("SPON26001")).toBe("RF18SPON26001");
  });

  it("pads a single-digit check number", () => {
    // Whatever the body, the two digits are always two digits.
    for (const body of ["A", "B", "C", "1", "2", "ZZ", "SPONSOR"]) {
      expect(buildCreditorReference(body)).toMatch(/^RF[0-9]{2}/);
    }
  });

  it("refuses a body that is empty or too long", () => {
    expect(() => buildCreditorReference("")).toThrow(RangeError);
    expect(() => buildCreditorReference("A".repeat(22))).toThrow(RangeError);
    expect(() => buildCreditorReference("A".repeat(21))).not.toThrow();
  });

  it("refuses anything but letters and digits", () => {
    for (const body of ["SPON-26", "SPON 26", "SPON/26", "SPON+26", "SPÖN26"]) {
      expect(() => buildCreditorReference(body)).toThrow(RangeError);
    }
  });
});

describe("isValidCreditorReference", () => {
  it("accepts what it built", () => {
    for (const body of ["SPON26001", "A", "z9", "SPON26X7QK3M42"]) {
      expect(isValidCreditorReference(buildCreditorReference(body))).toBe(true);
    }
  });

  it("accepts the printed form with its spaces", () => {
    expect(isValidCreditorReference("RF18 SPON 2600 1")).toBe(true);
  });

  it("rejects a single mistyped character", () => {
    const sound = buildCreditorReference("SPON26001");
    const damaged = `${sound.slice(0, -1)}${sound.at(-1) === "1" ? "2" : "1"}`;
    expect(isValidCreditorReference(damaged)).toBe(false);
  });

  it("rejects wrong check digits", () => {
    expect(isValidCreditorReference("RF19SPON26001")).toBe(false);
  });

  it("rejects what is not a reference at all", () => {
    for (const value of ["", "RF", "RF18", "SPON26001", "XX18SPON26001", "RFAB SPON2600 1"]) {
      expect(isValidCreditorReference(value)).toBe(false);
    }
  });
});

describe("creditorReferenceBody", () => {
  it("gives back what was put in", () => {
    expect(creditorReferenceBody(buildCreditorReference("SPON26001"))).toBe("SPON26001");
  });

  it("reads the printed form", () => {
    expect(creditorReferenceBody("RF18 SPON 2600 1")).toBe("SPON26001");
  });

  it("gives nothing for a damaged reference", () => {
    expect(creditorReferenceBody("RF19SPON26001")).toBeNull();
  });
});

describe("formatCreditorReference", () => {
  it("groups in fours", () => {
    expect(formatCreditorReference("RF18SPON26001")).toBe("RF18 SPON 2600 1");
  });

  it("is idempotent", () => {
    const once = formatCreditorReference("RF18SPON26001");
    expect(formatCreditorReference(once)).toBe(once);
  });
});

describe("randomReferenceBody", () => {
  /** Bytes that walk 0, 1, 2 and so on, so the drawing can be checked. */
  function counting(start: number) {
    let next = start;
    return (size: number) => Uint8Array.from({ length: size }, () => next++ & 0xff);
  }

  it("draws the length asked for", () => {
    expect(randomReferenceBody(15, counting(0))).toHaveLength(15);
  });

  it("draws only letters and digits", () => {
    expect(randomReferenceBody(21, counting(0))).toMatch(/^[A-Za-z0-9]{21}$/);
  });

  it("throws away bytes that would favour the start of the alphabet", () => {
    // 248 is the first byte at or above the ceiling of 4 * 62, so it is skipped
    // and the next byte is taken instead.
    const drawn = randomReferenceBody(1, counting(248));
    expect(drawn).toBe(randomReferenceBody(1, counting(249)));
  });

  it("builds a valid reference from what it drew", () => {
    const body = randomReferenceBody(15, counting(7));
    expect(isValidCreditorReference(buildCreditorReference(`SPON26${body}`))).toBe(true);
  });
});
