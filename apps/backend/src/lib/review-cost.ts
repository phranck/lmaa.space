import type { ReviewCost, ReviewProviderName, ReviewUsage } from "@lmaa/shared";

/**
 * Nano-units per whole currency unit.
 *
 * @remarks
 * All review amounts are counted in nano-units of the rate card's currency and
 * held as `bigint`. Provider rates are fractions of a cent per token, and
 * binary floating point cannot represent them exactly, so a repeated
 * calculation would drift.
 */
export const NANO_PER_UNIT = 1_000_000_000n;

const TOKENS_PER_MILLION = 1_000_000n;

/**
 * Prices for one model, in nano-units of {@link ReviewRateCard.currency}.
 */
export interface ReviewRateCardPrices {
  /** Price of one million input tokens that were not served from the cache. */
  inputPerMillion: bigint;
  /** Price of one million input tokens written into the provider's cache. */
  cacheWritePerMillion: bigint;
  /** Price of one million input tokens served from the provider's cache. */
  cacheReadPerMillion: bigint;
  /** Price of one million output tokens, which includes thinking tokens. */
  outputPerMillion: bigint;
  /** Price of a single provider-hosted web search. */
  perWebSearch: bigint;
}

/**
 * An effective-dated set of provider prices.
 *
 * @remarks
 * A price change creates a new version rather than editing this one, so a check
 * costed under an older version keeps the amount it was finalized with. The
 * conversion rate is pinned the same way and for the same reason: without it,
 * the euro figure of a check finished last month would drift with the exchange
 * rate every time somebody opened the page.
 */
export interface ReviewRateCard {
  version: string;
  /**
   * Provider whose published prices this card holds.
   *
   * @remarks
   * A model belongs to exactly one provider, so this is also what says which
   * provider owns each model the card prices. {@link reviewProviderForModel}
   * is the lookup, and the settings hold the configured model against the
   * configured provider with it.
   */
  provider: ReviewProviderName;
  /** Currency the provider bills in, which is what the stored amount counts. */
  currency: string;
  /** ISO 8601 date from which these prices and this conversion apply. */
  effectiveFrom: string;
  prices: Record<string, ReviewRateCardPrices>;
  /** Currency amounts are shown in. */
  displayCurrency: string;
  /** Nano-units of {@link ReviewRateCard.displayCurrency} for one whole unit of {@link ReviewRateCard.currency}. */
  displayRateNano: bigint;
}

/** One Anthropic-hosted web search, at 10 USD per thousand. */
const ANTHROPIC_PER_WEB_SEARCH_NANO = 10_000_000n;

/** One Mistral-hosted web search, at 30 USD per thousand. */
const MISTRAL_PER_WEB_SEARCH_NANO = 30_000_000n;

/**
 * The rules that turn a provider's two published rates into a full price row.
 *
 * @remarks
 * Both providers discount a repeated input token to a tenth, so that one is
 * derived rather than configured. The other two differ, and each is a figure a
 * provider publishes for itself.
 */
interface ReviewPriceDerivation {
  /**
   * What writing a token into the cache costs, as a multiple of the input rate
   * in hundredths.
   *
   * @remarks
   * Anthropic charges a quarter more than the input rate. Mistral publishes the
   * discount for reading and no surcharge for writing, so its multiple is one.
   */
  cacheWritePercent: bigint;
  /** Price of one provider-hosted web search, in nano-units. */
  perWebSearch: bigint;
}

/**
 * Builds one model's prices from its published input and output rates.
 *
 * @param inputPerMillionUsd - Price of one million input tokens, in USD.
 * @param outputPerMillionUsd - Price of one million output tokens, in USD.
 * @param derivation - The provider's rules for the rates it does not publish
 * per model.
 * @returns The four token rates and the search rate.
 *
 * @remarks
 * Deriving the cache rates means a new model needs its two published figures
 * and nothing else, and the two derived ones cannot be mistyped.
 */
function pricesFor(
  inputPerMillionUsd: number,
  outputPerMillionUsd: number,
  derivation: ReviewPriceDerivation,
): ReviewRateCardPrices {
  const input = BigInt(Math.round(inputPerMillionUsd * 1_000_000_000));
  return {
    inputPerMillion: input,
    cacheWritePerMillion: (input * derivation.cacheWritePercent) / 100n,
    cacheReadPerMillion: input / 10n,
    outputPerMillion: BigInt(Math.round(outputPerMillionUsd * 1_000_000_000)),
    perWebSearch: derivation.perWebSearch,
  };
}

/** Anthropic charges a quarter more for a cache write than for fresh input. */
const ANTHROPIC_DERIVATION: ReviewPriceDerivation = {
  cacheWritePercent: 125n,
  perWebSearch: ANTHROPIC_PER_WEB_SEARCH_NANO,
};

/** Mistral publishes no surcharge for a cache write, so it is priced as input. */
const MISTRAL_DERIVATION: ReviewPriceDerivation = {
  cacheWritePercent: 100n,
  perWebSearch: MISTRAL_PER_WEB_SEARCH_NANO,
};

/**
 * Prices published by Anthropic, as of 2026-08-15.
 *
 * @remarks
 * Every model the automation offers is listed, because a model without prices
 * would be costed at zero and would then also pass the daily ceiling untouched.
 * The figures are the published per-million rates for input and output; the
 * cache rates follow from the input rate as {@link pricesFor} describes.
 *
 * Sonnet 5 is listed at its regular rate rather than at the introductory one
 * that runs to 2026-08-31, so an amount is never lower than what was billed.
 *
 * Thinking tokens are already counted in the provider's output token figure, so
 * they are recorded for the audit trail and never priced a second time. Fetching
 * a page carries no fee of its own beyond the tokens its content occupies.
 */
const REVIEW_RATE_CARD_V1: ReviewRateCard = {
  version: "anthropic-2026-08-15",
  provider: "anthropic",
  currency: "USD",
  effectiveFrom: "2026-08-15",
  // 1 USD was 0.865 EUR on 2026-08-15. Pinned rather than fetched, because a
  // live rate would silently restate what a finished check cost.
  displayCurrency: "EUR",
  displayRateNano: 865_000_000n,
  prices: {
    "claude-fable-5": pricesFor(10, 50, ANTHROPIC_DERIVATION),
    "claude-opus-5": pricesFor(5, 25, ANTHROPIC_DERIVATION),
    "claude-opus-4-8": pricesFor(5, 25, ANTHROPIC_DERIVATION),
    "claude-opus-4-7": pricesFor(5, 25, ANTHROPIC_DERIVATION),
    "claude-opus-4-6": pricesFor(5, 25, ANTHROPIC_DERIVATION),
    "claude-sonnet-5": pricesFor(3, 15, ANTHROPIC_DERIVATION),
    "claude-sonnet-4-6": pricesFor(3, 15, ANTHROPIC_DERIVATION),
    "claude-haiku-4-5": pricesFor(1, 5, ANTHROPIC_DERIVATION),
  },
};

/**
 * Prices published by Mistral, as of 2026-09-03.
 *
 * @remarks
 * Both models are listed under their dated identifier and under the alias that
 * points at it, because either string may be what the account's model list
 * returns and a model this card cannot price is left out of the settings
 * entirely.
 *
 * The cache rates are carried for completeness and never apply in practice.
 * Mistral's conversation usage reports a prompt token count and nothing that
 * separates a cached token from a fresh one, so every prompt token is priced at
 * the full input rate. That is the honest reading of what a run reports, and it
 * is the more expensive of the two figures PAP-LMAA-010 gives.
 *
 * The conversion rate is the one the Anthropic card pins. Both cards bill in
 * USD and are shown in EUR, and a rate that differed by a few weeks would make
 * two providers' amounts incomparable for no gain.
 */
const MISTRAL_RATE_CARD_V1: ReviewRateCard = {
  version: "mistral-2026-09-03",
  provider: "mistral",
  currency: "USD",
  effectiveFrom: "2026-09-03",
  displayCurrency: "EUR",
  displayRateNano: 865_000_000n,
  prices: {
    "mistral-large-2512": pricesFor(0.5, 1.5, MISTRAL_DERIVATION),
    "mistral-large-latest": pricesFor(0.5, 1.5, MISTRAL_DERIVATION),
    "mistral-medium-2604": pricesFor(1.5, 7.5, MISTRAL_DERIVATION),
    "mistral-medium-latest": pricesFor(1.5, 7.5, MISTRAL_DERIVATION),
  },
};

/**
 * The cards new checks are costed against, one per provider.
 *
 * @remarks
 * A provider publishes its own prices and its own rules for deriving the rates
 * it does not publish, so each gets a card and each card is versioned on its
 * own. A price change at one provider therefore leaves the other's amounts
 * alone.
 */
const CURRENT_REVIEW_RATE_CARDS: readonly ReviewRateCard[] = [
  REVIEW_RATE_CARD_V1,
  MISTRAL_RATE_CARD_V1,
];

/**
 * The card used where no model is in hand.
 *
 * @remarks
 * Only its currency and its conversion rate are read this way, and every
 * current card agrees on both. Anything that prices actual usage goes through
 * {@link reviewRateCardFor} instead, because that answer depends on the model.
 */
export const DEFAULT_REVIEW_RATE_CARD = REVIEW_RATE_CARD_V1;

/**
 * Finds the current card that prices a model.
 *
 * @param model - Model identifier as its provider names it.
 * @returns The card holding its prices, or `undefined` when none does.
 *
 * @remarks
 * Selected by model rather than by provider, because a model identifier belongs
 * to exactly one provider and every caller already holds one. Passing the
 * provider as well would be a second way of saying the same thing, and the two
 * could disagree.
 */
function reviewRateCardFor(model: string): ReviewRateCard | undefined {
  return CURRENT_REVIEW_RATE_CARDS.find((card) => card.prices[model] !== undefined);
}

/**
 * Says which provider a model belongs to.
 *
 * @param model - Model identifier as its provider names it.
 * @returns The provider that publishes it, or `undefined` for a model no
 * current card knows.
 *
 * @remarks
 * Read from the rate cards rather than from a table of its own, because they
 * already enumerate every model a check may run on and a second list would
 * disagree with them the first time a model was added to one of the two.
 */
export function reviewProviderForModel(model: string): ReviewProviderName | undefined {
  return reviewRateCardFor(model)?.provider;
}

/**
 * Whether any current rate card can price a model.
 *
 * @param model - Model identifier as its provider names it.
 * @returns `true` when prices exist for it.
 *
 * @remarks
 * Asked before a model is offered as a setting, because a model without prices
 * is costed at zero and is then invisible to both the overview and the daily
 * ceiling.
 */
export function hasReviewPrices(model: string): boolean {
  return reviewRateCardFor(model) !== undefined;
}

/**
 * Every rate card that has ever priced a check, by version.
 *
 * @remarks
 * A finished amount names the version that produced it, and that version is
 * looked up here to convert it. Dropping an old card from this map would leave
 * the amounts it produced unconvertible, so entries are added and never
 * removed.
 */
const REVIEW_RATE_CARDS: Readonly<Record<string, ReviewRateCard>> = {
  [REVIEW_RATE_CARD_V1.version]: REVIEW_RATE_CARD_V1,
  [MISTRAL_RATE_CARD_V1.version]: MISTRAL_RATE_CARD_V1,
};

/**
 * Looks up the rate card an amount was produced under.
 *
 * @param version - Version the amount names.
 * @returns The card, or `undefined` when it is not known here.
 */
function findReviewRateCard(version: string): ReviewRateCard | undefined {
  return REVIEW_RATE_CARDS[version];
}

/**
 * An amount converted into the currency it is shown in.
 */
export interface ReviewDisplayAmount {
  /** Total in nano-units of {@link ReviewDisplayAmount.currency}. */
  totalNano: string;
  currency: string;
}

/**
 * Converts an amount into the currency it is shown in.
 *
 * @param cost - The amount, in the currency the provider billed.
 * @returns The converted amount, or the original when its rate card is unknown.
 *
 * @remarks
 * The conversion uses the rate pinned in the card the amount was produced
 * under, not today's rate, so what a check cost stays what it cost.
 */
export function toReviewDisplayAmount(cost: ReviewCost): ReviewDisplayAmount {
  const rateCard = findReviewRateCard(cost.rateCardVersion);
  if (!rateCard) return { totalNano: cost.totalNano, currency: cost.currency };

  const converted = (BigInt(cost.totalNano) * rateCard.displayRateNano) / NANO_PER_UNIT;
  return { totalNano: converted.toString(), currency: rateCard.displayCurrency };
}

function priceTokens(tokens: number | undefined, perMillion: bigint): bigint {
  if (tokens === undefined || tokens <= 0) return 0n;
  return (BigInt(Math.round(tokens)) * perMillion) / TOKENS_PER_MILLION;
}

/**
 * How a run was submitted, which decides what the provider charges for it.
 *
 * @remarks
 * The batches API is billed at half the standard prices, on every token line
 * and on the tool calls.
 */
export type ReviewBilling = "standard" | "batch";

/**
 * Prices one attempt's usage against a rate card.
 *
 * @param usage - Token counts and tool calls the provider reported.
 * @param model - Model the attempt ran on, used to select the prices.
 * @param rateCard - Rate card to price against; defaults to the current card
 * of whichever provider publishes the model.
 * @returns The amount, the rate card that produced it, and whether it is complete.
 *
 * @remarks
 * A dimension the provider did not report is listed in
 * {@link ReviewCost.missingDimensions} and leaves the amount marked incomplete.
 * Treating a missing figure as zero would produce an amount that looks final
 * and is too low, which is the one outcome worth preventing here.
 *
 * An unknown model has no prices at all. The result is then zero and
 * incomplete, never an amount derived from a different model's rates.
 */
export function calculateReviewCost(
  usage: ReviewUsage,
  model: string,
  rateCard: ReviewRateCard = reviewRateCardFor(model) ?? DEFAULT_REVIEW_RATE_CARD,
  billing: ReviewBilling = "standard",
): ReviewCost {
  const prices = rateCard.prices[model];
  if (!prices) {
    return {
      totalNano: "0",
      currency: rateCard.currency,
      rateCardVersion: rateCard.version,
      complete: false,
      missingDimensions: [`rateCard:${model}`],
    };
  }

  const missingDimensions: string[] = [];
  if (usage.inputTokens === undefined) missingDimensions.push("inputTokens");
  if (usage.outputTokens === undefined) missingDimensions.push("outputTokens");

  const total =
    priceTokens(usage.inputTokens, prices.inputPerMillion) +
    priceTokens(usage.cacheWriteTokens, prices.cacheWritePerMillion) +
    priceTokens(usage.cachedInputTokens, prices.cacheReadPerMillion) +
    priceTokens(usage.outputTokens, prices.outputPerMillion) +
    BigInt(Math.max(0, Math.round(usage.webSearchCalls ?? 0))) * prices.perWebSearch;

  return {
    // Batched usage is billed at half, so the amount that is stored is the
    // amount that is charged. Without this every batched check would be
    // recorded at twice its price, and the daily ceiling would stop the worker
    // at half the spending it was set to allow.
    totalNano: (billing === "batch" ? total / 2n : total).toString(),
    currency: rateCard.currency,
    rateCardVersion: rateCard.version,
    complete: missingDimensions.length === 0,
    missingDimensions,
  };
}

/**
 * Adds up the token counts of several attempts.
 *
 * @param usages - Usage of every attempt belonging to one check.
 * @returns One usage record covering all of them.
 *
 * @remarks
 * A dimension stays absent in the sum when no attempt reported it, so the
 * aggregate cost is marked incomplete for the same reason the attempt was.
 */
export function sumReviewUsage(usages: readonly ReviewUsage[]): ReviewUsage {
  const keys = [
    "inputTokens",
    "cacheWriteTokens",
    "cachedInputTokens",
    "outputTokens",
    "reasoningTokens",
    "webSearchCalls",
    "toolCalls",
  ] as const;

  const total: ReviewUsage = {};
  for (const key of keys) {
    const values = usages.map((usage) => usage[key]).filter((value) => value !== undefined);
    if (values.length > 0) {
      total[key] = values.reduce((sum, value) => sum + value, 0);
    }
  }
  return total;
}

/**
 * Adds up the amounts of several attempts.
 *
 * @param costs - Cost of every attempt belonging to one check.
 * @returns The summed amount, incomplete when any part of it was.
 *
 * @remarks
 * Amounts from different currencies or rate card versions are not comparable,
 * so a mismatch marks the total incomplete and names what differed instead of
 * quietly adding two figures that do not belong together.
 */
export function sumReviewCosts(costs: readonly ReviewCost[]): ReviewCost {
  if (costs.length === 0) {
    return {
      totalNano: "0",
      currency: DEFAULT_REVIEW_RATE_CARD.currency,
      rateCardVersion: DEFAULT_REVIEW_RATE_CARD.version,
      complete: true,
      missingDimensions: [],
    };
  }

  const first = costs[0];
  const missingDimensions = new Set<string>();
  let total = 0n;

  for (const cost of costs) {
    total += BigInt(cost.totalNano);
    for (const dimension of cost.missingDimensions) missingDimensions.add(dimension);
    if (cost.currency !== first.currency) missingDimensions.add(`currency:${cost.currency}`);
    if (cost.rateCardVersion !== first.rateCardVersion) {
      missingDimensions.add(`rateCard:${cost.rateCardVersion}`);
    }
  }

  return {
    totalNano: total.toString(),
    currency: first.currency,
    rateCardVersion: first.rateCardVersion,
    complete: missingDimensions.size === 0,
    missingDimensions: Array.from(missingDimensions),
  };
}

/**
 * Renders an amount for a human reader.
 *
 * @param cost - Amount to render.
 * @returns The amount in the display currency, marked when it is incomplete.
 *
 * @remarks
 * An incomplete amount is never rendered as a plain figure. It says so, because
 * a reader who sees `0,42 EUR` has no way of telling that a billable dimension
 * was missing from it.
 */
export function formatReviewCost(cost: ReviewCost): string {
  const display = toReviewDisplayAmount(cost);
  const units = Number(BigInt(display.totalNano)) / Number(NANO_PER_UNIT);
  const rendered = `${units.toLocaleString("de-DE", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })} ${display.currency}`;
  return cost.complete ? rendered : `${rendered} (unvollständig)`;
}

/**
 * Converts a ceiling given in whole display-currency units into the billed
 * currency, in nano-units.
 *
 * @param units - Ceiling as configured, for example `2` for two euros.
 * @param rateCard - Card whose rate converts it; defaults to the current one.
 * @returns The ceiling in nano-units of the billed currency.
 *
 * @remarks
 * A ceiling is entered in the currency the operator thinks in and compared
 * against amounts in the currency the provider bills, so it is converted once,
 * here. A ceiling looks forward, so it is converted at a current rate rather
 * than at whichever one an old amount was pinned to. Which current card that
 * comes from does not matter, because they agree on the currency and the rate.
 */
export function costLimitToNano(
  units: number,
  rateCard: ReviewRateCard = DEFAULT_REVIEW_RATE_CARD,
): bigint {
  const displayNano = BigInt(Math.round(units * Number(NANO_PER_UNIT)));
  return (displayNano * NANO_PER_UNIT) / rateCard.displayRateNano;
}
