import type { SponsorsPayload } from "@lmaa/contracts";

import { apiGet } from "@/lib/api";

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
  minAmountCents: 0,
  payeeName: "",
  payeeIban: "",
  payeeBic: "",
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
