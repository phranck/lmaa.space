import { describe, expect, it } from "vitest";

import { isCanonicalMistralModel } from "../services/review/models.js";

/**
 * Entries as Mistral's own model list returned them on 2026-09-03.
 *
 * @remarks
 * An alias carries the identifier it resolves to in its `name`, which is what
 * tells the two apart. Taken from a live listing rather than written from the
 * documentation, because the documentation does not describe this at all.
 */
const LISTED = [
  { id: "mistral-large-2512", name: "mistral-large-2512" },
  { id: "mistral-large-latest", name: "mistral-large-2512" },
  { id: "mistral-medium-latest", name: "mistral-medium-latest" },
  { id: "mistral-medium-2604", name: "mistral-medium-latest" },
  { id: "mistral-medium-3.5", name: "mistral-medium-latest" },
  { id: "mistral-medium", name: "mistral-medium-latest" },
];

describe("isCanonicalMistralModel", () => {
  it("keeps the entry that is the model", () => {
    expect(isCanonicalMistralModel("mistral-large-2512", "mistral-large-2512")).toBe(true);
    expect(isCanonicalMistralModel("mistral-medium-latest", "mistral-medium-latest")).toBe(true);
  });

  it("drops an entry that points at another model", () => {
    // These are aliases. Offering them puts a second option in the settings
    // that is labelled the same as the first and differs only in a value
    // nobody can see.
    expect(isCanonicalMistralModel("mistral-large-latest", "mistral-large-2512")).toBe(false);
    expect(isCanonicalMistralModel("mistral-medium-2604", "mistral-medium-latest")).toBe(false);
  });

  it("keeps an entry that names nothing", () => {
    // An unknown is not a reason to hide a model the rate card can price.
    expect(isCanonicalMistralModel("mistral-large-2512", undefined)).toBe(true);
    expect(isCanonicalMistralModel("mistral-large-2512", "")).toBe(true);
  });

  it("leaves one entry per model across the real listing", () => {
    const kept = LISTED.filter((entry) => isCanonicalMistralModel(entry.id, entry.name));

    expect(kept.map((entry) => entry.id)).toEqual([
      "mistral-large-2512",
      "mistral-medium-latest",
    ]);
    // Six entries describe two models, and every one of them would otherwise
    // reach the settings page.
    expect(new Set(kept.map((entry) => entry.name)).size).toBe(kept.length);
  });
});
