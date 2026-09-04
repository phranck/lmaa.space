import { describe, expect, it } from "vitest";

import {
  donationInputSchema,
  shopBodySchema,
  sponsorInputSchema,
  submissionEditSchema,
} from "@lmaa/contracts";

/**
 * Every schema that takes a whole record and replaces it.
 *
 * Each is parsed with the addresses under test and whatever else it requires,
 * so the case being checked is the same one in all four.
 */
const schemas = [
  {
    name: "a donation",
    parse: (socialMedia: unknown) =>
      donationInputSchema.safeParse({
        firstName: "Kim",
        lastName: "Lorenz",
        socialMedia,
        published: false,
        amountCents: 500,
        receivedAt: "2026-09-04",
        provider: "sepa",
        note: "",
        sponsorId: null,
      }),
  },
  {
    name: "a sponsor",
    parse: (socialMedia: unknown) =>
      sponsorInputSchema.safeParse({
        firstName: "Kim",
        lastName: "Lorenz",
        socialMedia,
        claim: "",
        published: false,
        amountCents: 4500,
        paidAt: "2026-09-04",
      }),
  },
  {
    name: "a shop",
    parse: (socialMedia: unknown) =>
      shopBodySchema.safeParse({
        name: "Beispielladen",
        url: "https://beispiel.de",
        socialMedia,
      }),
  },
  {
    name: "a suggestion",
    parse: (socialMedia: unknown) =>
      submissionEditSchema.safeParse({
        shopName: "Beispielladen",
        shopUrl: "https://beispiel.de",
        region: ["DE"],
        categoryIds: [1],
        socialMedia,
      }),
  },
];

describe("clearing the last address", () => {
  it.each(schemas)("leaves $name with an empty list rather than nothing at all", ({ parse }) => {
    // `undefined` is skipped by the update, so the address that was removed
    // stands there again after a reload. These routes replace the whole
    // record, so an empty list is the answer "no addresses".
    const result = parse([]);

    expect(result.success).toBe(true);
    expect(result.success && result.data.socialMedia).toEqual([]);
  });

  it.each(schemas)("leaves $name with an empty list where none was given", ({ parse }) => {
    const result = parse(undefined);

    expect(result.success).toBe(true);
    expect(result.success && result.data.socialMedia).toEqual([]);
  });
});

describe("addresses that were given", () => {
  it.each(schemas)("carries them through for $name", ({ parse }) => {
    const result = parse([{ platform: "mastodon", url: "https://chaos.social/@kim" }]);

    expect(result.success && result.data.socialMedia).toEqual([
      { platform: "mastodon", url: "https://chaos.social/@kim" },
    ]);
  });

  it.each(schemas)(
    "still refuses an address that does not fit its platform for $name",
    ({ parse }) => {
      const result = parse([{ platform: "mastodon", url: "not-an-address" }]);

      expect(result.success).toBe(false);
    },
  );
});
