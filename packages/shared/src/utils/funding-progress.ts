/**
 * How far the year's running costs are carried.
 *
 * One answer to one question, because more than one surface asks it: the
 * sponsor block writes the outstanding amount into a sentence, and a page may
 * name the same figure as a variable. Two subtractions would eventually
 * disagree, and nothing would say which one the reader should believe.
 */
export interface FundingProgress {
  /** Whether the costs are carried in full. */
  covered: boolean;
  /** What is left to the costs, in cents. Zero once they are carried. */
  missingCents: number;
}

/**
 * Works out what is left of the year's costs.
 *
 * @param costsTotalCents - What the year costs, as the settings hold it.
 * @param coveredCents - What has come in towards it.
 * @returns Whether it is carried, and what is missing.
 *
 * @remarks
 * Costs of zero are never covered. Nothing has been said about what the year
 * costs at that point, so a sentence announcing that it is paid for would be
 * claiming something nobody entered. The outstanding amount never goes below
 * zero either, because money beyond the costs is a surplus rather than a
 * negative shortfall, and no sentence on the site is written to say that.
 */
export function fundingProgress(
  costsTotalCents: number,
  coveredCents: number,
): FundingProgress {
  return {
    covered: costsTotalCents > 0 && coveredCents >= costsTotalCents,
    missingCents: Math.max(costsTotalCents - coveredCents, 0),
  };
}
