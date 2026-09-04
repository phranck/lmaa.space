import type { Payee, SponsorsPayload } from "@lmaa/contracts";

import { apiGet, apiGetInternal } from "@/lib/api";

/**
 * What the page shows when the sponsors cannot be read.
 *
 * A missing list is worth less than a broken page, so every field carries a
 * value the renderer can work with rather than nothing.
 */
export const EMPTY_SPONSORS: SponsorsPayload = {
  sponsors: [],
  costsTotalCents: 0,
  coveredCents: 0,
  donatedMonthCents: 0,
  minAmountCents: 0,
  // Zero rather than a guessed price, which is what makes `{reviewCost}` keep
  // its name in the text instead of stating that a check costs nothing.
  reviewCostAvgCents: 0,
};

/**
 * What the page shows when the account cannot be read.
 *
 * Empty rather than absent, so the support page still renders and says plainly
 * that something is missing instead of failing outright.
 */
export const EMPTY_PAYEE: Payee = {
  payeeName: "",
  payeeIban: "",
  payeeBic: "",
  purposeDonation: "",
  purposeSponsor: "",
  purposePaypal: "",
};

/**
 * The current sponsors, what the year costs, and what it takes to be named.
 *
 * Read on the server, because nothing here depends on the reader: who is listed
 * follows from who paid within the last year, and that is the same for
 * everybody. Two blocks on the support page need it, so it is fetched once for
 * the page rather than once per block.
 *
 * @returns The payload, or an empty one when the backend cannot be reached.
 */
export async function getSponsors(): Promise<SponsorsPayload> {
  try {
    return await apiGet<SponsorsPayload>("/sponsors");
  } catch {
    return EMPTY_SPONSORS;
  }
}

/**
 * The account a transfer goes to.
 *
 * Read through the website-internal route, which answers this renderer and
 * nobody else. The details are shown on the support page, where somebody is
 * about to transfer money, and they are kept out of the public API so they do
 * not travel with every answer about who is carrying the costs.
 *
 * @returns The account, or an empty one when the backend cannot be reached.
 */
export async function getPayee(): Promise<Payee> {
  try {
    return await apiGetInternal<Payee>("/internal/payee");
  } catch {
    return EMPTY_PAYEE;
  }
}
