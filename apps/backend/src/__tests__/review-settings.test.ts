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

describe("a model that belongs to the other provider", () => {
  beforeEach(() => {
    stored = {};
    vi.mocked(resolveReviewEffort).mockClear();
  });

  it("does not reach the provider that cannot run it", async () => {
    // The reported state: a Mistral model saved whilst no provider row exists,
    // so the provider falls back to Anthropic. The Anthropic adapter was then
    // handed `mistral-medium-latest`, submitted it as an Anthropic batch, and
    // had it refused after burning three attempts.
    stored = { [SETTINGS_KEYS.REVIEW_MODEL]: "mistral-medium-latest" };

    const settings = await loadReviewSettings();

    expect(settings.provider).toBe("anthropic");
    expect(settings.model).toBe("claude-opus-5");
  });

  it("gives way to the provider rather than the other way round", async () => {
    // The provider decides which account is billed, so it is the one that
    // stands. Deriving the provider from the model instead would move the
    // spending to an account nobody chose.
    stored = {
      [SETTINGS_KEYS.REVIEW_PROVIDER]: "mistral",
      [SETTINGS_KEYS.REVIEW_MODEL]: "claude-opus-5",
    };

    const settings = await loadReviewSettings();

    expect(settings.provider).toBe("mistral");
    expect(settings.model).toBe("mistral-medium-latest");
  });

  it("leaves a matching pair alone", async () => {
    stored = {
      [SETTINGS_KEYS.REVIEW_PROVIDER]: "mistral",
      [SETTINGS_KEYS.REVIEW_MODEL]: "mistral-large-2512",
    };

    const settings = await loadReviewSettings();

    expect(settings.model).toBe("mistral-large-2512");
  });

  it("lets a model no card knows reach its provider as configured", async () => {
    // A model released after the rate card was written. It fails at the
    // provider with the provider's own wording, which says more than this
    // quietly running something else would.
    stored = {
      [SETTINGS_KEYS.REVIEW_PROVIDER]: "anthropic",
      [SETTINGS_KEYS.REVIEW_MODEL]: "claude-opus-6",
    };

    const settings = await loadReviewSettings();

    expect(settings.model).toBe("claude-opus-6");
  });
});
