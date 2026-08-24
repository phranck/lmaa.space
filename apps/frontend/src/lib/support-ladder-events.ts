/**
 * How something outside the support ladder asks it to open one of its tabs.
 *
 * The ladder is an island and the sponsor wall above it is not, so the two
 * cannot share state. They share this event instead, and its name lives here
 * rather than being typed out on both sides, where the two spellings would part
 * company without anything noticing.
 */

import type { SupportLadderIntervalKey } from "@/lib/content-shortcode-segments";

/** The event the ladder listens for. */
export const CHOOSE_SUPPORT_INTERVAL_EVENT = "lmaa:choose-support-interval";

/** What that event carries. */
export interface ChooseSupportIntervalDetail {
  key: SupportLadderIntervalKey;
}

/**
 * Asks whichever ladder is on the page to open a tab.
 *
 * Does nothing observable when no ladder is listening, which is the state a
 * page without one is in.
 *
 * @param key - The tab to open.
 */
export function chooseSupportInterval(key: SupportLadderIntervalKey): void {
  window.dispatchEvent(
    new CustomEvent<ChooseSupportIntervalDetail>(CHOOSE_SUPPORT_INTERVAL_EVENT, {
      detail: { key },
    }),
  );
}
