import { describe, expect, it } from "vitest";

import { blueskyAccountCreateSchema } from "@lmaa/contracts";

describe("blueskyAccountCreateSchema.handle", () => {
  const baseInput = {
    label: "lmaa",
    appPassword: "abcd-efgh-ijkl-mnop",
    isActive: true,
  };

  it("accepts a domain-style handle", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      handle: "lmaa.bsky.social",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a custom-domain handle", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      handle: "lmaa.space",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an email address", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      handle: "frank@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.handle).toBe("frank@example.com");
  });

  it("lowercases the identifier", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      handle: "Frank@Example.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.handle).toBe("frank@example.com");
  });

  it("rejects a single word without dot or @", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      handle: "justaword",
    });
    expect(result.success).toBe(false);
  });
});

describe("blueskyAccountCreateSchema.appPassword", () => {
  const baseInput = {
    label: "lmaa",
    handle: "lmaa.bsky.social",
    isActive: true,
  };

  it("accepts an app-password format", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      appPassword: "abcd-efgh-ijkl-mnop",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an account-style password with mixed case and symbols", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      appPassword: "zpt3bwq4wvw6RKD!pcr",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a long passphrase", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      appPassword: "correct horse battery staple 12345",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      appPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 200 chars", () => {
    const result = blueskyAccountCreateSchema.safeParse({
      ...baseInput,
      appPassword: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
