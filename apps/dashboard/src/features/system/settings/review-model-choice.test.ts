import { describe, expect, it } from "vitest";

import { resolveReviewModelChoice } from "./review-model-choice.ts";

const ANTHROPIC = [
  { id: "claude-opus-5", displayName: "Claude Opus 5", efforts: ["high" as const] },
  { id: "claude-sonnet-5", displayName: "Claude Sonnet 5", efforts: ["high" as const] },
];

describe("resolveReviewModelChoice", () => {
  it("keeps the configured model chosen whilst the provider offers it", () => {
    const choice = resolveReviewModelChoice("claude-sonnet-5", ANTHROPIC);

    expect(choice.effective).toBe("claude-sonnet-5");
    expect(choice.options.map((option) => option.value)).toEqual([
      "claude-opus-5",
      "claude-sonnet-5",
    ]);
  });

  it("keeps a configured model the list does not hold, so an outage changes nothing", () => {
    // The list is empty whilst the provider cannot be reached. Dropping the
    // configured model here would save a different one the next time somebody
    // touched an unrelated field.
    const choice = resolveReviewModelChoice("claude-opus-5", []);

    expect(choice.effective).toBe("claude-opus-5");
    expect(choice.options).toEqual([{ value: "claude-opus-5", label: "claude-opus-5" }]);
  });

  it("takes the first model on offer when nothing is configured", () => {
    // A stored setting that is an empty string reaches the form as one, and
    // without this the field would sit blank until somebody noticed it.
    const choice = resolveReviewModelChoice("", ANTHROPIC);

    expect(choice.effective).toBe("claude-opus-5");
  });

  it("shows nothing whilst there is neither a configured model nor a list", () => {
    // Saving is held off in this state, so an empty model never reaches the
    // worker.
    expect(resolveReviewModelChoice("", []).effective).toBe("");
  });
});
