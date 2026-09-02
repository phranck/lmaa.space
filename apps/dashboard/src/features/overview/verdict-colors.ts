import type { ReviewVerdict } from "@lmaa/shared";

import { BADGE_TONES } from "@/components/ui/Badge.tsx";

/**
 * The colour each automated recommendation carries in a table cell.
 *
 * @remarks
 * A recommendation to admit and one to turn down are opposite answers, so they
 * take opposite colours rather than one shared accent that makes the reader
 * stop and read the word. `onhold` takes the neutral badge, because it is not
 * yet an answer either way and grey is what says so. Shared by every list that
 * shows a review verdict, so the colours mean the same thing wherever a verdict
 * appears, and `reject` reads as the same answer the submission status does.
 */
export const VERDICT_COLORS: Record<ReviewVerdict, string> = {
  accept: BADGE_TONES.success,
  reject: BADGE_TONES.rejected,
  onhold: BADGE_TONES.neutral,
};
