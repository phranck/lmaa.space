import { BADGE_TONES } from "@/components/ui/Badge.tsx";

import type { BankConnectionState } from "./bank-connection-state.ts";

/**
 * The colour each state of the bank connection carries.
 *
 * @remarks
 * These are the tones read for their own meaning rather than borrowed: a live
 * connection is in force, a consent about to lapse is waiting on somebody, and
 * one that has lapsed is gone. Not connected is the ordinary starting point and
 * takes the neutral badge, which says as much.
 *
 * The mapping lives beside the states whilst the colours stay in `BADGE_TONES`,
 * the same arrangement `USER_ROLE_COLORS` uses.
 */
export const BANK_CONNECTION_STATE_COLORS: Record<BankConnectionState, string> = {
  unconfigured: BADGE_TONES.neutral,
  disconnected: BADGE_TONES.neutral,
  expired: BADGE_TONES.danger,
  expiring: BADGE_TONES.pending,
  connected: BADGE_TONES.success,
};
