import { describe, expect, it } from "vitest";

import { normalizeAmountInput, readAmountInput } from "./amount-input.js";

describe("normalizeAmountInput", () => {
  it("keeps a whole amount as it is", () => {
    expect(normalizeAmountInput("25")).toBe("25");
  });

  it("keeps cents written with a comma", () => {
    expect(normalizeAmountInput("33,33")).toBe("33,33");
  });

  it("turns a decimal full stop into a comma", () => {
    expect(normalizeAmountInput("33.33")).toBe("33,33");
  });

  it("drops a full stop that groups thousands", () => {
    expect(normalizeAmountInput("1.000")).toBe("1000");
  });

  it("reads the comma as the decimal separator beside grouping stops", () => {
    expect(normalizeAmountInput("1.234,56")).toBe("1234,56");
  });

  it("drops every grouping separator in a long amount", () => {
    expect(normalizeAmountInput("1.234.567,89")).toBe("1234567,89");
  });

  it("removes whitespace, currency symbols, and letters", () => {
    expect(normalizeAmountInput(" € 12,50 EUR ")).toBe("12,50");
  });

  it("cuts the cents to two digits", () => {
    expect(normalizeAmountInput("5,12345")).toBe("5,12");
  });

  it("keeps a trailing separator whilst the cents are being typed", () => {
    expect(normalizeAmountInput("33,")).toBe("33,");
  });

  it("keeps only the last separator when several are typed", () => {
    expect(normalizeAmountInput("1,2,3")).toBe("12,3");
  });

  it("completes an amount that starts with the separator", () => {
    expect(normalizeAmountInput(",5")).toBe("0,5");
  });

  it("keeps a single leading zero and drops the rest", () => {
    expect(normalizeAmountInput("0,50")).toBe("0,50");
    expect(normalizeAmountInput("007")).toBe("7");
  });

  it("returns nothing when nothing usable was typed", () => {
    expect(normalizeAmountInput("abc")).toBe("");
    expect(normalizeAmountInput("")).toBe("");
  });
});

describe("readAmountInput", () => {
  it("reads a normalised amount", () => {
    expect(readAmountInput("33,33")).toBe(33.33);
  });

  it("refuses an amount of nothing", () => {
    expect(readAmountInput("0")).toBeNull();
    expect(readAmountInput("")).toBeNull();
    expect(readAmountInput(",")).toBeNull();
  });
});
