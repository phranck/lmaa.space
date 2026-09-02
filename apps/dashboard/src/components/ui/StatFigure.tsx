/** Everything one figure shows. */
export interface StatFigureProps {
  /** What the figure is called, read before the figure itself. */
  label: string;
  /**
   * The figure, already written out.
   *
   * Formatted by the caller rather than here, because the figures standing
   * beside each other are not all money: a count, an average and a share are
   * written three different ways and only the caller knows which this is.
   */
  value: string;
  /** An optional second line under the figure, such as what it is made of. */
  suffix?: string;
}

/**
 * One figure with its name above it, for a row of them across the top of a card.
 *
 * The figure is set in a tabular face so a column of them lines up digit under
 * digit, which is what makes two of them comparable at a glance.
 *
 * @param props - The name, the written figure, and an optional second line.
 * @returns A labelled figure.
 */
export function StatFigure({ label, value, suffix }: StatFigureProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--ds-text-hint)]">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-[var(--ds-text)]">{value}</span>
      {suffix && <span className="text-xs text-[var(--ds-text-hint)]">{suffix}</span>}
    </div>
  );
}
