import { AnthropicReviewProvider } from "./anthropic-provider.js";
import type { ReviewProvider } from "./provider.js";
import type { ReviewSettings } from "./settings.js";

/**
 * Builds the adapter a check runs on.
 *
 * @param settings - The review's runtime configuration.
 * @returns An adapter holding the configured model and effort.
 *
 * @remarks
 * Built per call rather than held, because the model and the effort are
 * settings a person changes in the dashboard and the worker reads them afresh
 * on every tick. An adapter kept from an earlier tick would go on running the
 * model somebody has already changed.
 *
 * A provider whose key is absent still produces an adapter. It reports itself
 * as unconfigured, and the worker treats that as a run that could not start.
 */
export function createReviewProvider(settings: ReviewSettings): ReviewProvider {
  return new AnthropicReviewProvider({ model: settings.model, effort: settings.effort });
}
