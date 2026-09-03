import { beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_KEYS } from "@lmaa/shared";

/** What the settings table is holding for this run. */
let stored: Record<string, string> = {};

vi.mock("../repositories/app-settings.js", () => ({
  getSettings: vi.fn(async () => stored),
}));

vi.mock("../services/review/models.js", () => ({
  // The effort is resolved against the chosen model's own list, which needs the
  // provider. Held here so the test can read which provider it was asked about.
  resolveReviewEffort: vi.fn(async (_provider: string, _model: string, effort: string) => effort),
}));

const { loadReviewSettings } = await import("../services/review/settings.js");
const { resolveReviewEffort } = await import("../services/review/models.js");

describe("the configured provider", () => {
  beforeEach(() => {
    stored = {};
    vi.mocked(resolveReviewEffort).mockClear();
  });

  it("is Anthropic when nothing has been saved", async () => {
    expect((await loadReviewSettings()).provider).toBe("anthropic");
  });

  it("is what was saved, where that is a provider we have", async () => {
    stored = { [SETTINGS_KEYS.REVIEW_PROVIDER]: "mistral" };
    expect((await loadReviewSettings()).provider).toBe("mistral");
  });

  it("falls back rather than trusting whatever the settings table holds", async () => {
    // The table takes any string, and an unknown name would otherwise reach the
    // factory and pick a provider by accident.
    stored = { [SETTINGS_KEYS.REVIEW_PROVIDER]: "openai" };
    expect((await loadReviewSettings()).provider).toBe("anthropic");
  });

  it("is read case-insensitively and without surrounding space", async () => {
    stored = { [SETTINGS_KEYS.REVIEW_PROVIDER]: " Mistral " };
    expect((await loadReviewSettings()).provider).toBe("mistral");
  });

  it("decides which provider the effort is held against", async () => {
    stored = {
      [SETTINGS_KEYS.REVIEW_PROVIDER]: "mistral",
      [SETTINGS_KEYS.REVIEW_MODEL]: "mistral-large-2512",
      [SETTINGS_KEYS.REVIEW_EFFORT]: "xhigh",
    };

    await loadReviewSettings();

    // Asking Anthropic about a Mistral model returns the configured level
    // unchanged, so a level that model does not accept would survive as far as
    // the request.
    expect(resolveReviewEffort).toHaveBeenCalledWith("mistral", "mistral-large-2512", "xhigh");
  });
});
