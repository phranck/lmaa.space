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
   * Empty only whilst no model is configured and none has arrived yet, which is
   * the moment between choosing a provider and its list coming back. Saving is
   * held off until then, because an empty model leaves the worker without one.
   */
  effective: string;
}

/**
 * Works out what the model field shows for a given provider.
 *
 * @param configured - Model held in the form, empty after a provider change.
 * @param available - Models the chosen provider reports, empty whilst the list
 * is loading or when it could not be fetched.
 * @returns The options to offer and the model a run would use.
 *
 * @remarks
 * Two cases decide this and they pull in opposite directions, which is why it
 * is worked out in one place rather than in the render.
 *
 * A configured model that the list does not hold stays selectable, so an outage
 * at the provider never silently rewrites the setting to something else.
 *
 * After a provider change there is no configured model, because choosing a
 * provider clears it. The first model of the new provider then stands in, since
 * keeping the old one would offer one provider's model under another's name.
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
