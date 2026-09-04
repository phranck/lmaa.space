import type { ReviewModelOption } from "./hooks/useSystemSettings.ts";

/** One entry of the model field. */
export interface ReviewModelChoiceOption {
  value: string;
  label: string;
}

/** What the model field offers and what it currently shows. */
export interface ReviewModelChoice {
  options: ReviewModelChoiceOption[];
  /**
   * The model a run would use, which is what a save writes.
   *
   * @remarks
   * Empty only whilst no model is configured and none has arrived yet. Saving
   * is held off until then, because an empty model leaves the worker without
   * one.
   */
  effective: string;
}

/**
 * Works out what the model field shows.
 *
 * @param configured - Model held in the form, which may be empty.
 * @param available - Models the provider reports, empty whilst the list is
 * loading or when it could not be fetched.
 * @returns The options to offer and the model a run would use.
 *
 * @remarks
 * Two cases decide this and they pull in opposite directions, which is why it
 * is worked out in one place rather than in the render.
 *
 * A configured model that the list does not hold stays selectable, so an outage
 * at the provider never silently rewrites the setting to something else. Where
 * nothing is configured at all, the first model on offer stands in, so the
 * field is never blank whilst a list exists.
 */
export function resolveReviewModelChoice(
  configured: string,
  available: readonly ReviewModelOption[],
): ReviewModelChoice {
  const options: ReviewModelChoiceOption[] = available.map((model) => ({
    value: model.id,
    label: model.displayName,
  }));

  if (configured && !options.some((option) => option.value === configured)) {
    options.unshift({ value: configured, label: configured });
  }

  return { options, effective: configured || (options[0]?.value ?? "") };
}
