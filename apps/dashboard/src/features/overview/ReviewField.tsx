/** Caption of a read-only value, used by every surface that shows a check. */
export const reviewLabelClass = "text-xs uppercase tracking-wide text-[var(--ds-text-muted)]";

/** The value itself. */
export const reviewValueClass = "text-sm text-[var(--ds-text)]";

/**
 * One read-only value of an automated check, with its caption above it.
 *
 * @param label - The caption.
 * @param value - The value, already formatted for reading.
 * @returns The pair.
 *
 * @remarks
 * Shared by the panel on the detail page and the progress dialog, so the two
 * cannot drift into showing the same figure in two different shapes.
 */
export function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={reviewLabelClass}>{label}</span>
      <span className={reviewValueClass}>{value}</span>
    </div>
  );
}
