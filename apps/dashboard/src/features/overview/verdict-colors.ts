import type { ReviewVerdict } from "@lmaa/shared";

/**
 * The colour each automated recommendation carries in a table cell.
 *
 * @remarks
 * A recommendation to admit and one to reject are opposite answers, so they
 * take the success and danger colours rather than one shared accent that makes
 * the reader stop and read the word. `onhold` takes the neutral badge, because
 * it is not yet an answer either way and grey is what says so. Shared by every
 * list that shows a review verdict, so the colours mean the same thing wherever
 * a verdict appears.
 *
 * All three name a badge token. A surface token here draws the chip in the
 * colour of whatever stands behind it, which is how `onhold` came to look
 * uncoloured beside two that were not.
 */
export const VERDICT_COLORS: Record<ReviewVerdict, string> = {
  accept: "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]",
  reject: "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]",
  onhold: "bg-[var(--ds-badge-neutral-bg)] text-[var(--ds-badge-neutral-text)]",
};
