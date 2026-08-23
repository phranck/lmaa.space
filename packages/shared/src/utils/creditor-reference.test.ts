import { describe, expect, it } from "vitest";

import {
  REFERENCE_BODY_ALPHABET,
  buildCreditorReference,
  formatCreditorReference,
  isValidCreditorReference,
  normalizeCreditorReference,
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

describe("normalizeCreditorReference", () => {
  it("gives back what was issued", () => {
    const issued = buildCreditorReference("SPON26001");
    expect(normalizeCreditorReference(issued)).toBe(issued);
  });

  it("reads the printed form", () => {
    expect(normalizeCreditorReference("RF18 SPON 2600 1")).toBe("RF18SPON26001");
  });

  it("restores the case a bank may have dropped", () => {
    expect(normalizeCreditorReference("rf18 spon 2600 1")).toBe("RF18SPON26001");
  });

  it("gives nothing for a damaged reference", () => {
    expect(normalizeCreditorReference("RF19SPON26001")).toBeNull();
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

  it("draws only from the unambiguous alphabet", () => {
    expect(randomReferenceBody(21, counting(0))).toMatch(
      new RegExp(`^[${REFERENCE_BODY_ALPHABET}]{21}$`),
    );
  });

  it("leaves out the characters that are misread on a statement", () => {
    for (const character of ["I", "L", "O", "U"]) {
      expect(REFERENCE_BODY_ALPHABET).not.toContain(character);
    }
    expect(REFERENCE_BODY_ALPHABET).toBe(REFERENCE_BODY_ALPHABET.toUpperCase());
  });

  it("gives every character of the alphabet the same weight", () => {
    // One full cycle of byte values, so a draw that favoured the start of the
    // alphabet would show up as an uneven count.
    const drawn = randomReferenceBody(256, counting(0));
    const timesPerCharacter = 256 / REFERENCE_BODY_ALPHABET.length;

    for (const character of REFERENCE_BODY_ALPHABET) {
      expect(drawn.split(character).length - 1).toBe(timesPerCharacter);
    }
  });

  it("builds a valid reference from what it drew", () => {
    const body = randomReferenceBody(15, counting(7));
    expect(isValidCreditorReference(buildCreditorReference(`SPON26${body}`))).toBe(true);
  });
});
