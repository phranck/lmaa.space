/**
 * What the support ladder is showing, as one state with named transitions.
 *
 * Four values move together and were four `useState` calls before: the tab that
 * was clicked, the tab whose body is on screen, the chosen amount and what
 * stands in the free field. Choosing a tab changes all four, in two steps
 * separated by the fade, and a reducer is what keeps those steps readable.
 *
 * The marker's position stays outside this. It is measured from layout after a
 * render rather than decided, so it belongs to the element it measures.
 */

import type {
  SupportLadderInterval,
  SupportLadderIntervalKey,
} from "@/lib/content-shortcode-segments";

/** What the ladder is showing right now. */
export interface SupportLadderState {
  /**
   * The tab that was clicked.
   *
   * Moves the moment somebody clicks, because that is the thing they just did.
   */
  intervalKey: SupportLadderIntervalKey;
  /**
   * The tab whose body is on screen.
   *
   * Follows {@link SupportLadderState.intervalKey} once the old body has faded,
   * so two of them are never half visible at once.
   */
  shownKey: SupportLadderIntervalKey;
  /** The amount a transfer would carry, in euro. */
  amountEur: number;
  /** What stands in the free field. Empty whilst a suggested amount is chosen. */
  customAmount: string;
}

/** Everything that can happen to the ladder. */
export type SupportLadderAction =
  /** Somebody clicked a tab. Only the switch moves. */
  | { type: "choose-interval"; key: SupportLadderIntervalKey }
  /** The fade has finished, so the body and the amounts follow. */
  | {
      type: "show-interval";
      key: SupportLadderIntervalKey;
      interval: SupportLadderInterval | undefined;
      floorEur: number;
    }
  /** Somebody picked one of the suggested amounts. */
  | { type: "choose-amount"; amountEur: number }
  /** Somebody typed in the free field. */
  | {
      type: "enter-custom";
      /** What the field holds, already cleaned of separators and stray characters. */
      cleaned: string;
      /** What that reads as, or `null` where it is not yet a number. */
      amountEur: number | null;
      /** The tab currently shown, whose suggestion takes over on an empty field. */
      interval: SupportLadderInterval | undefined;
      floorEur: number;
    };

/**
 * The amount a tab opens on.
 *
 * @param interval - The tab being opened.
 * @param floorEur - The least amount that tab accepts, in euro.
 * @returns The amount to start at.
 *
 * @remarks
 * The page decides by flagging one option `recommended`. Without a flag the
 * second rung is taken, which is low enough not to hide the cheapest option and
 * high enough not to anchor the visitor on it. A tab that suggests nothing
 * opens on the floor it names instead, which is what the sponsor tab does:
 * there is one amount that counts, the least one.
 */
export function startingAmount(interval: SupportLadderInterval | undefined, floorEur = 0): number {
  if (!interval || interval.options.length === 0) return floorEur;
  const flagged = interval.options.find((option) => option.recommended);
  if (flagged) return flagged.amountEur;
  return interval.options[Math.min(1, interval.options.length - 1)].amountEur;
}

/**
 * What the free field holds when a tab opens.
 *
 * @param interval - The tab being opened.
 * @param floorEur - The least amount that tab accepts, in euro.
 * @returns What to put in the field.
 *
 * @remarks
 * A tab with suggested amounts leaves it empty, because one of those amounts is
 * the choice until somebody types. A tab without them has nothing else to show,
 * so its floor stands in the field ready to be changed.
 */
export function startingCustomAmount(
  interval: SupportLadderInterval | undefined,
  floorEur: number,
): string {
  if (!interval || interval.options.length > 0 || floorEur <= 0) return "";
  return String(floorEur);
}

/**
 * Where the ladder stands when it first renders.
 *
 * @param intervals - The tabs the page defined, in order.
 * @param floorEur - The least amount a sponsorship accepts, in euro.
 * @returns The opening state.
 */
export function initialSupportLadderState(
  intervals: readonly SupportLadderInterval[],
  floorEur: number,
): SupportLadderState {
  const first = intervals[0];
  const key = first?.key ?? "once";

  return {
    intervalKey: key,
    shownKey: key,
    amountEur: startingAmount(first, floorEur),
    customAmount: startingCustomAmount(first, floorEur),
  };
}

/**
 * Moves the ladder from one state to the next.
 *
 * @param state - Where it stands.
 * @param action - What happened.
 * @returns Where it stands afterwards.
 */
export function supportLadderReducer(
  state: SupportLadderState,
  action: SupportLadderAction,
): SupportLadderState {
  switch (action.type) {
    // The switch answers the click straight away. The body follows in
    // `show-interval`, once it has faded.
    case "choose-interval":
      return action.key === state.intervalKey ? state : { ...state, intervalKey: action.key };

    case "show-interval":
      return {
        ...state,
        shownKey: action.key,
        amountEur: startingAmount(action.interval, action.floorEur),
        customAmount: startingCustomAmount(action.interval, action.floorEur),
      };

    // Picking a rung clears the field, because the two are one choice and the
    // field showing a number nobody chose would claim otherwise.
    case "choose-amount":
      return { ...state, amountEur: action.amountEur, customAmount: "" };

    case "enter-custom": {
      // Emptying the field hands the choice back to the ladder, so the
      // recommended amount becomes the active one again.
      if (action.cleaned === "") {
        return {
          ...state,
          customAmount: "",
          amountEur: startingAmount(action.interval, action.floorEur),
        };
      }

      // A field holding something that is not yet a number keeps the amount it
      // had, so a half-typed figure does not reset the transfer.
      return {
        ...state,
        customAmount: action.cleaned,
        amountEur: action.amountEur ?? state.amountEur,
      };
    }
  }
}
