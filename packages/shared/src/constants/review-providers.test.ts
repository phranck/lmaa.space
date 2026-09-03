import { describe, expect, it } from "vitest";

import {
  REVIEW_PROVIDER_LABELS,
  REVIEW_PROVIDERS,
  REVIEW_SETTING_DEFAULTS,
  SETTINGS_KEYS,
  SYSTEM_REVIEW_SETTINGS_KEYS,
} from "./settings.js";

describe("the review providers", () => {
  it("all carry a name to show", () => {
    // A provider added to the list without a label would reach the settings
    // page as an empty option, which reads as a broken form rather than as a
    // missing string.
    for (const provider of REVIEW_PROVIDERS) {
      expect(REVIEW_PROVIDER_LABELS[provider]).toBeTruthy();
    }
  });

  it("carry no name that names nothing", () => {
    expect(Object.keys(REVIEW_PROVIDER_LABELS).sort()).toEqual([...REVIEW_PROVIDERS].sort());
  });

  it("include the one the settings default to", () => {
    // A default outside the list is clamped away on every load, so the worker
    // would silently run on something nobody chose.
    const fallback = REVIEW_SETTING_DEFAULTS[SETTINGS_KEYS.REVIEW_PROVIDER];
    expect(REVIEW_PROVIDERS).toContain(fallback);
  });

  it("are readable and writable through the settings page", () => {
    // The key has to travel with the rest, or the dashboard reads a provider it
    // cannot save and the form silently reverts on the next load.
    expect(SYSTEM_REVIEW_SETTINGS_KEYS).toContain(SETTINGS_KEYS.REVIEW_PROVIDER);
  });
});
