import { describe, expect, it } from "vitest";

import { resolveReviewModelChoice } from "./review-model-choice.ts";

const ANTHROPIC = [
  { id: "claude-opus-5", displayName: "Claude Opus 5", efforts: ["high" as const] },
  { id: "claude-sonnet-5", displayName: "Claude Sonnet 5", efforts: ["high" as const] },
];

const MISTRAL = [
  { id: "mistral-large-2512", displayName: "Mistral Large 3", efforts: ["high" as const] },
];

describe("resolveReviewModelChoice", () => {
  it("keeps the configured model chosen whilst its provider offers it", () => {
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

  it("takes the new provider's first model once the model has been cleared", () => {
    // Choosing a provider clears the model, because a model belongs to exactly
    // one provider. Without this the field would sit empty until somebody
    // noticed it.
    const choice = resolveReviewModelChoice("", MISTRAL);

    expect(choice.effective).toBe("mistral-large-2512");
  });

  it("shows nothing whilst the cleared model has no list to be replaced from", () => {
    // The moment between choosing a provider and its list arriving. Saving is
    // held off until it does, so an empty model never reaches the worker.
    expect(resolveReviewModelChoice("", []).effective).toBe("");
  });

  it("never offers one provider's model under another's list", () => {
    // The failing shape this guards: an Anthropic model surviving a switch to
    // Mistral, being saved, and then failing at the provider with a model it
    // has never heard of.
    const choice = resolveReviewModelChoice("", MISTRAL);

    expect(choice.options.map((option) => option.value)).not.toContain("claude-opus-5");
  });
});
