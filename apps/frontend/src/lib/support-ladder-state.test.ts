import { describe, expect, it } from "vitest";

import type {
  SupportLadderInterval,
  SupportLadderIntervalKey,
} from "@/lib/content-shortcode-segments";

import {
  initialSupportLadderState,
  startingAmount,
  startingCustomAmount,
  supportLadderReducer,
  type SupportLadderState,
} from "./support-ladder-state.ts";

/** A tab with rungs, the shape the page defines one in. */
function withOptions(
  key: SupportLadderIntervalKey,
  amounts: number[],
  recommended?: number,
): SupportLadderInterval {
  return {
    key,
    label: key,
    text: "",
    options: amounts.map((amountEur) => ({
      amountEur,
      text: "",
      recommended: amountEur === recommended,
    })),
  } as unknown as SupportLadderInterval;
}

/** A tab without rungs, which is what the sponsor tab is. */
function withoutOptions(key: SupportLadderIntervalKey): SupportLadderInterval {
  return { key, label: key, text: "", options: [] } as unknown as SupportLadderInterval;
}

const monthly = withOptions("monthly", [3, 5, 10, 20]);
const once = withOptions("once", [5, 20, 60, 225], 20);
const sponsor = withoutOptions("sponsor");

/** The ladder as it opens on the monthly tab. */
function state(overrides: Partial<SupportLadderState> = {}): SupportLadderState {
  return { ...initialSupportLadderState([monthly], 45), ...overrides };
}

describe("where the ladder opens", () => {
  it("takes the flagged rung where the page flagged one", () => {
    expect(startingAmount(once, 45)).toBe(20);
  });

  it("takes the second rung where nothing is flagged", () => {
    // Low enough not to hide the cheapest option, high enough not to anchor
    // the visitor on it.
    expect(startingAmount(monthly, 45)).toBe(5);
  });

  it("takes the floor where a tab suggests nothing", () => {
    // The sponsor tab has one amount that counts, which is the least one.
    expect(startingAmount(sponsor, 45)).toBe(45);
  });

  it("leaves the field empty where rungs stand beside it", () => {
    expect(startingCustomAmount(monthly, 45)).toBe("");
  });

  it("puts the floor in the field where nothing else would be shown", () => {
    expect(startingCustomAmount(sponsor, 45)).toBe("45");
  });

  it("opens both keys on the first tab", () => {
    const opened = initialSupportLadderState([once, monthly], 45);
    expect(opened).toMatchObject({ intervalKey: "once", shownKey: "once", amountEur: 20 });
  });
});

describe("choosing a tab", () => {
  it("moves the switch alone, so the body can fade first", () => {
    const next = supportLadderReducer(state(), { type: "choose-interval", key: "once" });

    expect(next.intervalKey).toBe("once");
    expect(next.shownKey).toBe("monthly");
    expect(next.amountEur).toBe(5);
  });

  it("changes nothing when the tab is already the chosen one", () => {
    const current = state();
    expect(supportLadderReducer(current, { type: "choose-interval", key: "monthly" })).toBe(
      current,
    );
  });

  it("brings the body and both amounts once the fade has finished", () => {
    const chosen = supportLadderReducer(state(), { type: "choose-interval", key: "once" });
    const shown = supportLadderReducer(chosen, {
      type: "show-interval",
      key: "once",
      interval: once,
      floorEur: 45,
    });

    expect(shown).toMatchObject({
      intervalKey: "once",
      shownKey: "once",
      amountEur: 20,
      customAmount: "",
    });
  });

  it("fills the field when the tab it opens suggests nothing", () => {
    const shown = supportLadderReducer(state(), {
      type: "show-interval",
      key: "sponsor",
      interval: sponsor,
      floorEur: 45,
    });

    expect(shown).toMatchObject({ shownKey: "sponsor", amountEur: 45, customAmount: "45" });
  });
});

describe("choosing an amount", () => {
  it("clears the field, because a rung and the field are one choice", () => {
    const typed = state({ customAmount: "33", amountEur: 33 });
    const chosen = supportLadderReducer(typed, { type: "choose-amount", amountEur: 10 });

    expect(chosen).toMatchObject({ amountEur: 10, customAmount: "" });
  });
});

describe("typing in the free field", () => {
  it("takes what was typed once it reads as a number", () => {
    const next = supportLadderReducer(state(), {
      type: "enter-custom",
      cleaned: "33",
      amountEur: 33,
      interval: monthly,
      floorEur: 45,
    });

    expect(next).toMatchObject({ customAmount: "33", amountEur: 33 });
  });

  it("keeps the amount whilst the field holds something that is not one yet", () => {
    // A half-typed figure must not reset the transfer under the reader.
    const next = supportLadderReducer(state({ amountEur: 10 }), {
      type: "enter-custom",
      cleaned: "1,",
      amountEur: null,
      interval: monthly,
      floorEur: 45,
    });

    expect(next).toMatchObject({ customAmount: "1,", amountEur: 10 });
  });

  it("hands the choice back to the ladder when the field is emptied", () => {
    const typed = state({ customAmount: "33", amountEur: 33 });
    const cleared = supportLadderReducer(typed, {
      type: "enter-custom",
      cleaned: "",
      amountEur: null,
      interval: monthly,
      floorEur: 45,
    });

    expect(cleared).toMatchObject({ customAmount: "", amountEur: 5 });
  });
});
