import Anthropic from "@anthropic-ai/sdk";
import { Mistral } from "@mistralai/mistralai";

import { REVIEW_EFFORT_LEVELS, resolveEffortLevel } from "@lmaa/shared";
import type { ReviewEffortLevel, ReviewProviderName } from "@lmaa/shared";

import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { hasReviewPrices } from "../../lib/review-cost.js";

/**
 * A model the automated review can be configured to run on.
 */
export interface ReviewModelOption {
  id: string;
  displayName: string;
  /**
   * Reasoning efforts this model accepts.
   *
   * @remarks
   * Read from the model itself, because the levels differ between models and a
   * request carrying an unsupported one is refused with a 400 before anything
   * is researched.
   */
  efforts: ReviewEffortLevel[];
}

/**
 * How long a fetched model list is reused.
 *
 * @remarks
 * The list changes when the provider releases a model, so an hour is far
 * shorter than it needs to be and still spares the settings page a request per
 * render.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

const cached = new Map<ReviewProviderName, { options: ReviewModelOption[]; fetchedAt: number }>();

/**
 * Efforts a Mistral model with reasoning accepts.
 *
 * @remarks
 * Mistral's own list is `none`, `minimal`, `low`, `medium`, `high` and `xhigh`.
 * The two below the shared scale have no place to be chosen from, and `max` is
 * on the shared scale without being on Mistral's, so what remains is the
 * overlap. A level outside it is refused with a 400 before anything is
 * researched.
 */
const MISTRAL_EFFORT_LEVELS: readonly ReviewEffortLevel[] = ["low", "medium", "high", "xhigh"];

/**
 * Reads a named capability out of an Anthropic model description.
 *
 * @param model - The model as Anthropic describes it.
 * @param name - The capability to read.
 * @returns The capability, or `undefined` where the model names none.
 */
function readCapability(model: unknown, name: string): unknown {
  const capabilities = (model as { capabilities?: unknown }).capabilities;
  if (typeof capabilities !== "object" || capabilities === null) return undefined;
  return (capabilities as Record<string, unknown>)[name];
}

/**
 * Decides whether an Anthropic model can run a check at all.
 *
 * @param model - The model as Anthropic describes it.
 * @returns `false` only where the model states that it cannot.
 *
 * @remarks
 * Every check asks for adaptive thinking, so a model without it refuses the
 * request outright. Such a model is left out of the list rather than offered
 * and then failing, which is the whole point of asking the provider what each
 * model can do. A model that says nothing is kept, because an unknown is not a
 * reason to hide it.
 */
function canRunReview(model: unknown): boolean {
  const thinking = readCapability(model, "thinking");
  if (typeof thinking !== "object" || thinking === null) return true;
  if ((thinking as { supported?: unknown }).supported === false) return false;

  const types = (thinking as { types?: unknown }).types;
  if (typeof types !== "object" || types === null) return true;

  const adaptive = (types as { adaptive?: unknown }).adaptive;
  if (typeof adaptive !== "object" || adaptive === null) return true;
  return (adaptive as { supported?: unknown }).supported !== false;
}

/**
 * Reads the accepted reasoning efforts out of an Anthropic model description.
 *
 * @param model - The model as Anthropic describes it.
 * @returns The accepted levels, or every level when the model says nothing.
 *
 * @remarks
 * Falling back to every level rather than to none keeps a model usable when
 * Anthropic adds a shape this does not know. The request then fails as it does
 * today instead of the model disappearing from the settings page.
 */
function readEfforts(model: unknown): ReviewEffortLevel[] {
  const effort = readCapability(model, "effort");
  if (typeof effort !== "object" || effort === null) return [...REVIEW_EFFORT_LEVELS];
  if ((effort as { supported?: unknown }).supported === false) return [];

  const accepted = REVIEW_EFFORT_LEVELS.filter((level) => {
    const entry = (effort as Record<string, unknown>)[level];
    if (typeof entry !== "object" || entry === null) return false;
    return (entry as { supported?: unknown }).supported === true;
  });

  return accepted.length > 0 ? accepted : [...REVIEW_EFFORT_LEVELS];
}

/**
 * Lists the models a check can run on, with the efforts each one accepts.
 *
 * @param provider - Provider whose models to list.
 * @returns The available models, or an empty list when none could be fetched.
 *
 * @remarks
 * Held per provider, because switching between them in the settings would
 * otherwise show one provider's models under the other's name until the hour
 * was up.
 *
 * Read from the provider rather than kept as a list in the code, because a
 * hard-coded list is wrong the day a model is released or retired and nobody
 * notices until a run fails. The same holds for the reasoning efforts, which is
 * why each model is asked about itself rather than matched against a table.
 *
 * A model the rate card cannot price is left out. Such a model would run, cost
 * money, and be recorded at zero, which would also let it pass the daily
 * ceiling untouched.
 *
 * An empty list is returned rather than an error when the key is missing or the
 * call fails. The settings page then falls back to showing the configured value
 * on its own, so a provider outage cannot make the settings uneditable.
 */
export async function listReviewModels(
  provider: ReviewProviderName = "anthropic",
): Promise<ReviewModelOption[]> {
  const held = cached.get(provider);
  if (held && Date.now() - held.fetchedAt < CACHE_TTL_MS) return held.options;

  try {
    const options =
      provider === "mistral" ? await listMistralModels() : await listAnthropicModels();
    cached.set(provider, { options, fetchedAt: Date.now() });
    return options;
  } catch (error) {
    logger.warn({ err: error, provider }, "could not list provider models");
    return held?.options ?? [];
  }
}

/**
 * Lists Anthropic's models, asking each one what it can do.
 *
 * @returns The models a check can run on, or an empty list without a key.
 */
async function listAnthropicModels(): Promise<ReviewModelOption[]> {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const client = new Anthropic({ apiKey });
  const listed: Array<{ id: string; displayName: string }> = [];
  for await (const model of client.models.list()) {
    listed.push({ id: model.id, displayName: model.display_name });
  }

  const described = await Promise.all(
    listed.map(async (entry) => ({ entry, described: await client.models.retrieve(entry.id) })),
  );

  return described.flatMap(({ entry, described: model }) =>
    canRunReview(model) && hasReviewPrices(entry.id)
      ? [{ ...entry, efforts: readEfforts(model) }]
      : [],
  );
}

/**
 * Lists Mistral's models, asking each one what it can do.
 *
 * @returns The models a check can run on, or an empty list without a key.
 *
 * @remarks
 * One call answers everything, because Mistral describes a model's capabilities
 * in the list itself rather than behind a second request per model.
 *
 * A model that reports no reasoning is kept and offered without an effort,
 * unlike the Anthropic path which drops such a model. The two differ because a
 * check submitted to Anthropic asks for adaptive thinking outright and is
 * refused without it, whilst a Mistral request simply omits the effort.
 */
async function listMistralModels(): Promise<ReviewModelOption[]> {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) return [];

  const client = new Mistral({ apiKey });
  const listed = await client.models.list();

  return (listed.data ?? []).flatMap((entry) => {
    // The SDK's model list is a union that includes a card shape it does not
    // know, so the two fields this needs are read off the raw object rather
    // than narrowed. A model without an identifier cannot be offered anyway.
    const model = entry as {
      id?: unknown;
      name?: unknown;
      capabilities?: { completionChat?: boolean; reasoning?: boolean };
    };

    if (typeof model.id !== "string" || !hasReviewPrices(model.id)) return [];
    if (model.capabilities?.completionChat === false) return [];

    return [
      {
        id: model.id,
        displayName: typeof model.name === "string" ? model.name : model.id,
        efforts: model.capabilities?.reasoning ? [...MISTRAL_EFFORT_LEVELS] : [],
      },
    ];
  });
}

/**
 * Picks an effort the given model accepts.
 *
 * @param provider - Provider the run is configured for.
 * @param model - Model the run is configured for.
 * @param effort - Effort the operator configured.
 * @returns The level the run may use, which is the configured one wherever the
 * model accepts it, and `null` where the model takes no effort at all.
 *
 * @remarks
 * The settings page only offers accepted levels, so this covers the case where
 * a model is retired or its levels change after somebody last saved. Without
 * it, that change turns into a 400 on the next run rather than into a slightly
 * different effort.
 */
export async function resolveReviewEffort(
  provider: ReviewProviderName,
  model: string,
  effort: ReviewEffortLevel,
): Promise<ReviewEffortLevel | null> {
  const options = await listReviewModels(provider);
  const known = options.find((option) => option.id === model);
  return known ? resolveEffortLevel(known.efforts, effort) : effort;
}
