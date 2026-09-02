import type { DonationOrigin } from "@lmaa/contracts";

import { BADGE_TONES } from "@/components/ui/Badge.tsx";

/**
 * The colour each origin carries in the ledger.
 *
 * Neither is good or bad, so both are read for what they are rather than for a
 * verdict: a payment the site read for itself is worth knowing about, and one
 * somebody typed is the ordinary case and takes the neutral badge.
 *
 * The mapping lives beside the ledger whilst the colours stay in `BADGE_TONES`,
 * the same arrangement `USER_ROLE_COLORS` uses.
 */
export const DONATION_ORIGIN_COLORS: Record<DonationOrigin, string> = {
  manual: BADGE_TONES.neutral,
  bank: BADGE_TONES.info,
};
