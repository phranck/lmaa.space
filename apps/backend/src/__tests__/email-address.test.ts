import { describe, expect, it } from "vitest";

import { extractRecipientAddress, isEmailRecipient } from "../lib/email-address.js";

describe("isEmailRecipient", () => {
  it("accepts a bare address", () => {
    expect(isEmailRecipient("user@example.com")).toBe(true);
  });

  it("accepts the display-name form the provider supports", () => {
    expect(isEmailRecipient("Jane Doe <jane@example.com>")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isEmailRecipient("  user@example.com  ")).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["undefined", undefined],
    ["null", null],
  ])("rejects %s", (_label, value) => {
    expect(isEmailRecipient(value)).toBe(false);
  });

  // The public suggestion form fed this value straight through to the provider
  // because the previous check only asked for `/.+@.+/`.
  it("rejects a value that is not an address at all", () => {
    expect(isEmailRecipient("THIS-IS-NOT-AN-EMAIL")).toBe(false);
  });

  it("rejects a domain without a dot", () => {
    expect(isEmailRecipient("user@localhost")).toBe(false);
  });

  it("rejects a missing local part", () => {
    expect(isEmailRecipient("@example.com")).toBe(false);
  });

  describe("header injection", () => {
    it.each([
      ["CRLF", "user@example.com\r\nBcc: victim@example.com"],
      ["bare LF", "user@example.com\nBcc: victim@example.com"],
      ["bare CR", "user@example.com\rBcc: victim@example.com"],
      ["tab", "user@example.com\tBcc: victim@example.com"],
      ["NUL", "user@example.com\u0000Bcc: victim@example.com"],
      ["DEL", "user@example.com\u007fBcc: victim@example.com"],
    ])("rejects a value carrying %s", (_label, value) => {
      expect(isEmailRecipient(value)).toBe(false);
    });

    it("rejects control characters hidden inside the display-name form", () => {
      expect(isEmailRecipient("Jane\r\nBcc: victim@example.com <jane@example.com>")).toBe(false);
    });
  });

  describe("multiple addresses", () => {
    it.each([
      ["comma separated", "a@example.com,b@example.com"],
      ["semicolon separated", "a@example.com;b@example.com"],
      ["space separated", "a@example.com b@example.com"],
    ])("rejects %s", (_label, value) => {
      expect(isEmailRecipient(value)).toBe(false);
    });
  });

  it("rejects a value beyond the length bound", () => {
    const local = "a".repeat(320);
    expect(isEmailRecipient(`${local}@example.com`)).toBe(false);
  });
});

describe("extractRecipientAddress", () => {
  it("returns the bare address unchanged", () => {
    expect(extractRecipientAddress("user@example.com")).toBe("user@example.com");
  });

  it("strips the display name", () => {
    expect(extractRecipientAddress("Jane Doe <jane@example.com>")).toBe("jane@example.com");
  });

  it("returns null when there is no usable address", () => {
    expect(extractRecipientAddress("Jane Doe <not-an-address>")).toBeNull();
  });
});
