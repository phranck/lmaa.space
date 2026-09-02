import type { AdminRole } from "@lmaa/shared";

import { BADGE_TONES } from "@/components/ui/Badge.tsx";

/**
 * The colour each role carries in the user list.
 *
 * @remarks
 * An owner and an admin can do things a moderator cannot, so those are the two
 * rows worth finding at a glance and they carry a colour. A moderator is the
 * ordinary case and takes the neutral badge, which says as much.
 *
 * A role is a rank rather than a state, so it matches none of the meanings the
 * badge tones are named for. The two here are borrowed for their weight: amber
 * reads as the top of a hierarchy and blue as the step below it. That is worth
 * knowing before reading `pending` as a statement about an owner.
 *
 * The mapping lives beside the roles whilst the colours stay in `BADGE_TONES`,
 * which is the arrangement `VERDICT_COLORS` and `STATUS_COLORS` use as well.
 */
export const USER_ROLE_COLORS: Record<AdminRole, string> = {
  owner: BADGE_TONES.pending,
  admin: BADGE_TONES.info,
  moderator: BADGE_TONES.neutral,
};
