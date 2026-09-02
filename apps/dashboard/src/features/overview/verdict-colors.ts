import type { ReviewVerdict } from "@lmaa/shared";

/**
 * The colour each automated recommendation carries in a table cell.
 *
 * @remarks
 * A recommendation to admit and one to reject are opposite answers, so they
 * take the success and danger colours rather than one shared accent that makes
 * the reader stop and read the word. `onhold` stays neutral, because it is not
 * yet an answer either way. Shared by every list that shows a review verdict,
 * so the colours mean the same thing wherever a verdict appears.
 */
export const VERDICT_COLORS: Record<ReviewVerdict, string> = {
  accept: "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]",
  reject: "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]",
  onhold: "bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)]",
};
