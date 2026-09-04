import { beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_KEYS } from "@lmaa/shared";

/** What the settings table is holding for this run. */
let stored: Record<string, string> = {};

vi.mock("../repositories/app-settings.js", () => ({
  getSettings: vi.fn(async () => stored),
}));

vi.mock("../services/review/models.js", () => ({
  // Held here so the test can read which model the effort was resolved
  // against, which is the whole point of resolving it at all.
  resolveReviewEffort: vi.fn(async (_model: string, effort: string) => effort),
}));

const { loadReviewSettings } = await import("../services/review/settings.js");
const { resolveReviewEffort } = await import("../services/review/models.js");

describe("the configured model", () => {
  beforeEach(() => {
    stored = {};
    vi.mocked(resolveReviewEffort).mockClear();
  });

  it("is the default when nothing has been saved", async () => {
    expect((await loadReviewSettings()).model).toBe("claude-opus-5");
  });

  it("is what was saved", async () => {
    stored = { [SETTINGS_KEYS.REVIEW_MODEL]: "claude-sonnet-5" };
    expect((await loadReviewSettings()).model).toBe("claude-sonnet-5");
  });

  it("falls back where the row holds nothing but space", async () => {
    // The settings table takes any string, and an empty model would leave the
    // adapter submitting a request without one.
    stored = { [SETTINGS_KEYS.REVIEW_MODEL]: "   " };
    expect((await loadReviewSettings()).model).toBe("claude-opus-5");
  });

  it("reaches the provider as configured when no rate card knows it", async () => {
    // A model released after the rate card was written. It fails at the
    // provider with the provider's own wording, which says more than this
    // quietly running something else would.
    stored = { [SETTINGS_KEYS.REVIEW_MODEL]: "claude-opus-6" };
    expect((await loadReviewSettings()).model).toBe("claude-opus-6");
  });

  it("is what the effort is held against", async () => {
    // Which levels a model accepts differs between models, so a level saved
    // for one model has to be checked against whichever model now runs.
    stored = {
      [SETTINGS_KEYS.REVIEW_MODEL]: "claude-sonnet-5",
      [SETTINGS_KEYS.REVIEW_EFFORT]: "xhigh",
    };

    await loadReviewSettings();

    expect(resolveReviewEffort).toHaveBeenCalledWith("claude-sonnet-5", "xhigh");
  });
});
