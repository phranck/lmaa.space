import { formatEuroCents, fundingProgress } from "@lmaa/shared";

/** Everything the funding bar needs. */
export interface FundingProgressBarProps {
  /** What the year costs, as the sponsoring settings hold it, in cents. */
  costsTotalCents: number;
  /** What has come in towards it over the sponsor year, in cents. */
  coveredCents: number;
  /** What each of the three figures beside the bar is called. */
  labels: { covered: string; missing: string; costs: string; done: string };
}

/**
 * How far the year's running costs are carried.
 *
 * One bar rather than a chart, because there is one figure against one target
 * and a reader wants to know whether it is reached. The three amounts stand
 * beside it in full, so nobody has to judge a length to learn what is missing.
 *
 * The share and the outstanding amount come from `fundingProgress`, which is
 * also what the sponsor block on the site reads. Subtracting again here would
 * be a second answer to the question the site already answers, and the two
 * would eventually differ.
 *
 * @param props - The costs, what has come in, and the four words around them.
 * @returns A labelled progress bar.
 */
export function FundingProgressBar({
  costsTotalCents,
  coveredCents,
  labels,
}: FundingProgressBarProps) {
  const { covered, missingCents } = fundingProgress(costsTotalCents, coveredCents);
  // Capped at the full width, because money beyond the costs is a surplus and a
  // bar cannot be more than full. The figures beside it still say how much.
  const filledPercent =
    costsTotalCents > 0 ? Math.min((coveredCents / costsTotalCents) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <span className="text-xs text-[var(--ds-text-hint)]">
          {labels.covered}{" "}
          <span className="tabular-nums text-[var(--ds-text)]">
            {formatEuroCents(coveredCents)}
          </span>{" "}
          {labels.costs}{" "}
          <span className="tabular-nums text-[var(--ds-text)]">
            {formatEuroCents(costsTotalCents)}
          </span>
        </span>
        <span className="text-xs text-[var(--ds-text-hint)]">
          {covered ? (
            labels.done
          ) : (
            <>
              {labels.missing}{" "}
              <span className="tabular-nums text-[var(--ds-text)]">
                {formatEuroCents(missingCents)}
              </span>
            </>
          )}
        </span>
      </div>

      {/* The track carries the meter's role so a screen reader gets the figure
          rather than a width, and the label names what is being measured. */}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={costsTotalCents}
        aria-valuenow={Math.min(coveredCents, costsTotalCents)}
        aria-valuetext={`${formatEuroCents(coveredCents)} ${labels.costs} ${formatEuroCents(costsTotalCents)}`}
        aria-label={labels.covered}
        className="h-2.5 w-full overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-bg-elevated)]"
      >
        <div
          className="h-full rounded-[var(--ds-radius-pill)] bg-[var(--ds-chart-series-1)]"
          style={{ width: `${filledPercent}%` }}
        />
      </div>
    </div>
  );
}
