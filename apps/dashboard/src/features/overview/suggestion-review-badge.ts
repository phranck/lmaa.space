import { isActiveReviewJobState, type ReviewJobListItem, type ReviewVerdict } from "@lmaa/shared";

import { BADGE_TONES } from "@/components/ui/Badge.tsx";
import { VERDICT_COLORS } from "@/features/overview/verdict-colors.ts";

/**
 * What the suggestions list says about the automated check of one row.
 *
 * @remarks
 * A row said nothing at all whilst a check was queued, running or failing, so a
 * suggestion the automation was holding looked exactly like one nobody had
 * touched. The badge is decided from the job's state rather than from its
 * verdict, because a verdict only exists once the check has finished.
 */
export interface SuggestionReviewBadge {
  /** Which label to read, either a job state or a verdict. */
  kind: "state" | "verdict";
  /** The key to look the label up under, within that kind. */
  key: string;
  /** Background and text colour, as utility classes reading design tokens. */
  colorClass: string;
}

/**
 * Works out the badge for one row of the suggestions list.
 *
 * @param job - The automated check of that submission, or `undefined` where
 * none has ever run.
 * @returns The badge, or `null` where the row should carry none.
 *
 * @remarks
 * A check still under way takes the informational colour, which nothing else in
 * this table uses: the yellow beside it means a submission is waiting for a
 * person, and the violet means it is ready for one. A check that failed or was
 * cancelled says so rather than looking like a check that never happened, and a
 * finished one shows its verdict exactly as it did before.
 *
 * `job.progress` is deliberately not read. Its own type says the text is
 * German, and the dashboard runs in two languages.
 */
export function resolveSuggestionReviewBadge(
  job: ReviewJobListItem | undefined,
): SuggestionReviewBadge | null {
  if (!job) return null;

  if (isActiveReviewJobState(job.state)) {
    return { kind: "state", key: job.state, colorClass: BADGE_TONES.info };
  }

  if (job.state === "failed") {
    return { kind: "state", key: job.state, colorClass: BADGE_TONES.danger };
  }

  if (job.state === "cancelled") {
    return { kind: "state", key: job.state, colorClass: BADGE_TONES.neutral };
  }

  // Finished. A run that ended without one is a run that decided nothing, and
  // an empty badge would say less than no badge at all.
  if (!job.verdict) return null;

  return {
    kind: "verdict",
    key: job.verdict,
    colorClass: VERDICT_COLORS[job.verdict as ReviewVerdict],
  };
}
