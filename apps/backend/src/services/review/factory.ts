import { AnthropicReviewProvider } from "./anthropic-provider.js";
import { MistralReviewProvider } from "./mistral-provider.js";
import type { ReviewProvider } from "./provider.js";
import type { ReviewSettings } from "./settings.js";

/**
 * Builds the adapter the settings name.
 *
 * @param settings - The review's runtime configuration.
 * @returns An adapter for the configured provider, holding its model and effort.
 *
 * @remarks
 * Built per call rather than held, because the provider, the model and the
 * effort are settings a person changes in the dashboard and the worker reads
 * them afresh on every tick. An adapter kept from an earlier tick would go on
 * running the model somebody has already changed.
 *
 * A provider whose key is absent still produces an adapter. It reports itself
 * as unconfigured, and the worker treats that as a run that could not start
 * rather than as a reason to fall back to the other provider, because falling
 * back would silently bill an account the operator did not choose.
 */
export function createReviewProvider(settings: ReviewSettings): ReviewProvider {
  const options = { model: settings.model, effort: settings.effort };
  return settings.provider === "mistral"
    ? new MistralReviewProvider(options)
    : new AnthropicReviewProvider(options);
}
