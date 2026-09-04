import { describe, expect, it } from "vitest";

import type { ReviewJobListItem, ReviewJobState, ReviewVerdict } from "@lmaa/shared";

import { BADGE_TONES } from "@/components/ui/Badge.tsx";
import { VERDICT_COLORS } from "@/features/overview/verdict-colors.ts";

import { resolveSuggestionReviewBadge } from "./suggestion-review-badge.ts";

/** A check in one state, with only the fields the badge reads. */
function job(state: ReviewJobState, verdict: ReviewVerdict | null = null) {
  return { state, verdict } as ReviewJobListItem;
}

describe("a check that is still under way", () => {
  it.each<ReviewJobState>(["queued", "running", "provider_waiting", "applying"])(
    "says so whilst it is %s, in a colour nothing else in this table uses",
    (state) => {
      // Yellow beside it means a submission waits for a person and violet means
      // it is ready for one, so a check in progress takes neither.
      expect(resolveSuggestionReviewBadge(job(state))).toEqual({
        kind: "state",
        key: state,
        colorClass: BADGE_TONES.info,
      });
    },
  );
});

describe("a check that ended without deciding", () => {
  it("says a failed check failed, rather than looking like no check at all", () => {
    expect(resolveSuggestionReviewBadge(job("failed"))).toEqual({
      kind: "state",
      key: "failed",
      colorClass: BADGE_TONES.danger,
    });
  });

  it("says a cancelled check was cancelled, in the muted pair", () => {
    expect(resolveSuggestionReviewBadge(job("cancelled"))).toEqual({
      kind: "state",
      key: "cancelled",
      colorClass: BADGE_TONES.neutral,
    });
  });
});

describe("a check that finished", () => {
  it.each<ReviewVerdict>(["accept", "reject", "onhold"])(
    "shows the %s verdict in the colour it has everywhere else",
    (verdict) => {
      expect(resolveSuggestionReviewBadge(job("completed", verdict))).toEqual({
        kind: "verdict",
        key: verdict,
        colorClass: VERDICT_COLORS[verdict],
      });
    },
  );

  it("shows nothing where it finished without a verdict", () => {
    // A run that decided nothing says less with an empty badge than with none.
    expect(resolveSuggestionReviewBadge(job("completed"))).toBeNull();
  });
});

describe("a submission no check has touched", () => {
  it("carries no badge", () => {
    expect(resolveSuggestionReviewBadge(undefined)).toBeNull();
  });
});
