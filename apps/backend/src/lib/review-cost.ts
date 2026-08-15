import type { ReviewCost, ReviewUsage } from "@lmaa/shared";

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

/** One provider-hosted web search, at 10 USD per thousand. */
const PER_WEB_SEARCH_NANO = 10_000_000n;

/**
 * Builds one model's prices from its published input and output rates.
 *
 * @param inputPerMillionUsd - Price of one million input tokens, in USD.
 * @param outputPerMillionUsd - Price of one million output tokens, in USD.
 * @returns The four token rates and the search rate.
 *
 * @remarks
 * Cache reads are a tenth of the input rate and cache writes one and a quarter
 * times it, for every model. Deriving them means a new model needs its two
 * published figures and nothing else, and the two derived ones cannot be
 * mistyped.
 */
function pricesFor(inputPerMillionUsd: number, outputPerMillionUsd: number): ReviewRateCardPrices {
  const input = BigInt(Math.round(inputPerMillionUsd * 1_000_000_000));
  return {
    inputPerMillion: input,
    cacheWritePerMillion: (input * 125n) / 100n,
    cacheReadPerMillion: input / 10n,
    outputPerMillion: BigInt(Math.round(outputPerMillionUsd * 1_000_000_000)),
    perWebSearch: PER_WEB_SEARCH_NANO,
  };
}

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
export const REVIEW_RATE_CARD_V1: ReviewRateCard = {
  version: "anthropic-2026-08-15",
  currency: "USD",
  effectiveFrom: "2026-08-15",
  // 1 USD was 0.865 EUR on 2026-08-15. Pinned rather than fetched, because a
  // live rate would silently restate what a finished check cost.
  displayCurrency: "EUR",
  displayRateNano: 865_000_000n,
  prices: {
    "claude-fable-5": pricesFor(10, 50),
    "claude-opus-5": pricesFor(5, 25),
    "claude-opus-4-8": pricesFor(5, 25),
    "claude-opus-4-7": pricesFor(5, 25),
    "claude-opus-4-6": pricesFor(5, 25),
    "claude-sonnet-5": pricesFor(3, 15),
    "claude-sonnet-4-6": pricesFor(3, 15),
    "claude-haiku-4-5": pricesFor(1, 5),
  },
};

/**
 * Whether the current rate card can price a model.
 *
 * @param model - Model identifier as the provider names it.
 * @returns `true` when prices exist for it.
 *
 * @remarks
 * Asked before a model is offered as a setting, because a model without prices
 * is costed at zero and is then invisible to both the overview and the daily
 * ceiling.
 */
export function hasReviewPrices(model: string): boolean {
  return CURRENT_REVIEW_RATE_CARD.prices[model] !== undefined;
}

/**
 * The rate card new checks are costed against.
 */
export const CURRENT_REVIEW_RATE_CARD = REVIEW_RATE_CARD_V1;

/**
 * Every rate card that has ever priced a check, by version.
 *
 * @remarks
 * A finished amount names the version that produced it, and that version is
 * looked up here to convert it. Dropping an old card from this map would leave
 * the amounts it produced unconvertible, so entries are added and never
 * removed.
 */
export const REVIEW_RATE_CARDS: Readonly<Record<string, ReviewRateCard>> = {
  [REVIEW_RATE_CARD_V1.version]: REVIEW_RATE_CARD_V1,
};

/**
 * Looks up the rate card an amount was produced under.
 *
 * @param version - Version the amount names.
 * @returns The card, or `undefined` when it is not known here.
 */
export function findReviewRateCard(version: string): ReviewRateCard | undefined {
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
 * Prices one attempt's usage against a rate card.
 *
 * @param usage - Token counts and tool calls the provider reported.
 * @param model - Model the attempt ran on, used to select the prices.
 * @param rateCard - Rate card to price against; defaults to the current one.
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
  rateCard: ReviewRateCard = CURRENT_REVIEW_RATE_CARD,
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
    totalNano: total.toString(),
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
      currency: CURRENT_REVIEW_RATE_CARD.currency,
      rateCardVersion: CURRENT_REVIEW_RATE_CARD.version,
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
 * here. The current card's rate is the right one because a ceiling looks
 * forward: it bounds checks that will be priced by exactly that card.
 */
export function costLimitToNano(
  units: number,
  rateCard: ReviewRateCard = CURRENT_REVIEW_RATE_CARD,
): bigint {
  const displayNano = BigInt(Math.round(units * Number(NANO_PER_UNIT)));
  return (displayNano * NANO_PER_UNIT) / rateCard.displayRateNano;
}
