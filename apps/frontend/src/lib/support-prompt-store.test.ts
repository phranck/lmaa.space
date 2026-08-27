import { describe, expect, it } from "vitest";

import {
  choosePrompt,
  countShopView,
  emptyStore,
  parseStore,
  recordDismissed,
  recordResolved,
  recordShown,
  type PromptCandidate,
} from "./support-prompt-store.js";

const limits = {
  maxShown: 4,
  snoozeDays: 14,
  dismissSnoozeDays: 90,
  dismissalsUntilResolved: 3,
  devAlwaysShow: false,
};
const now = 1_700_000_000_000;

function candidate(id: string, threshold = 0, priority = 0) {
  return { id, threshold, thresholdBasis: "viewed" as const, priority };
}

describe("choosePrompt", () => {
  it("shows nothing once the reader has seen enough", () => {
    const store = { ...emptyStore(), shown: 4 };
    expect(choosePrompt([candidate("a")], store, limits, { viewed: 10, liked: 10 }, now)).toBeNull();
  });

  it("shows nothing whilst the site is meant to be quiet", () => {
    const store = { ...emptyStore(), snoozedUntil: now + 1000 };
    expect(choosePrompt([candidate("a")], store, limits, { viewed: 10, liked: 10 }, now)).toBeNull();
  });

  it("measures a running quiet period against the setting in force now", () => {
    // Begun two days ago whilst the setting said fourteen. With the setting at
    // one, those two days are long past and the reader may be asked again.
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    const store = {
      ...emptyStore(),
      snoozedSince: twoDaysAgo,
      snoozedUntil: twoDaysAgo + 14 * 24 * 60 * 60 * 1000,
    };
    expect(choosePrompt([candidate("a")], store, { ...limits, snoozeDays: 1 }, { viewed: 10, liked: 10 }, now)).not.toBeNull();
  });

  it("keeps quiet whilst the shortened period itself is still running", () => {
    const anHourAgo = now - 60 * 60 * 1000;
    const store = {
      ...emptyStore(),
      snoozedSince: anHourAgo,
      snoozedUntil: anHourAgo + 14 * 24 * 60 * 60 * 1000,
    };
    expect(choosePrompt([candidate("a")], store, { ...limits, snoozeDays: 1 }, { viewed: 10, liked: 10 }, now)).toBeNull();
  });

  it("is never quiet at all when the setting is zero days", () => {
    const store = { ...emptyStore(), snoozedSince: now, snoozedUntil: now + 14 * 24 * 60 * 60 * 1000 };
    expect(choosePrompt([candidate("a")], store, { ...limits, snoozeDays: 0 }, { viewed: 10, liked: 10 }, now)).not.toBeNull();
  });

  it("respects a stored end where no beginning was recorded", () => {
    // A store written before the beginning was kept has nothing to measure
    // against, so what it says stands.
    const store = { ...emptyStore(), snoozedUntil: now + 1000 };
    expect(choosePrompt([candidate("a")], store, { ...limits, snoozeDays: 0 }, { viewed: 10, liked: 10 }, now)).toBeNull();
  });

  it("sets every limit aside whilst always-show is on", () => {
    // For working on a prompt: the ceiling, the quiet period and a prompt the
    // reader is done with all step aside, so it shows on every page view.
    const store = {
      ...recordResolved({ ...emptyStore(), shown: 99 }, "a"),
      snoozedSince: now,
      snoozedUntil: now + 10 ** 12,
    };
    expect(choosePrompt([candidate("a")], store, limits, { viewed: 10, liked: 10 }, now, true)?.id).toBe("a");
  });

  it("keeps the threshold even whilst always-show is on", () => {
    // The threshold says which prompt belongs on this page, not how often one
    // reader may be asked, so setting it aside would show the wrong prompt.
    expect(choosePrompt([candidate("a", 3)], emptyStore(), limits, { viewed: 2, liked: 2 }, now, true)).toBeNull();
  });

  it("reads the counter the prompt names", () => {
    const kept = { ...candidate("a", 3), thresholdBasis: "liked" as const };
    const seen = candidate("b", 3);
    const progress = { viewed: 0, liked: 5 };

    expect(choosePrompt([kept], emptyStore(), limits, progress, now)?.id).toBe("a");
    expect(choosePrompt([seen], emptyStore(), limits, progress, now)).toBeNull();
  });

  it("falls back to the default counter where a prompt names none", () => {
    // A record written before the counter existed must still be held to its
    // threshold. Reading an absent counter would compare against undefined,
    // which is never less than the threshold, and the prompt would show at once.
    const withoutBasis = { id: "a", threshold: 3, priority: 0 } as unknown as PromptCandidate;

    expect(choosePrompt([withoutBasis], emptyStore(), limits, { viewed: 2, liked: 9 }, now)).toBeNull();
    expect(choosePrompt([withoutBasis], emptyStore(), limits, { viewed: 3, liked: 0 }, now)?.id).toBe("a");
  });

  it("waits until the reader has reached the threshold", () => {
    expect(choosePrompt([candidate("a", 3)], emptyStore(), limits, { viewed: 2, liked: 2 }, now)).toBeNull();
    expect(choosePrompt([candidate("a", 3)], emptyStore(), limits, { viewed: 3, liked: 3 }, now)?.id).toBe("a");
  });

  it("skips a prompt this reader is done with", () => {
    const store = recordResolved(emptyStore(), "a");
    expect(choosePrompt([candidate("a"), candidate("b")], store, limits, { viewed: 9, liked: 9 }, now)?.id).toBe("b");
  });

  it("prefers the higher priority", () => {
    const chosen = choosePrompt(
      [candidate("a", 0, 1), candidate("b", 0, 7), candidate("c", 0, 3)],
      emptyStore(),
      limits, { viewed: 9, liked: 9 }, now,
    );
    expect(chosen?.id).toBe("b");
  });

  it("keeps the order the server sent when two carry the same priority", () => {
    const chosen = choosePrompt(
      [candidate("first", 0, 5), candidate("second", 0, 5)],
      emptyStore(),
      limits, { viewed: 9, liked: 9 }, now,
    );
    expect(chosen?.id).toBe("first");
  });
});

describe("recordShown", () => {
  it("counts the reader's total and the prompt's own, and goes quiet", () => {
    const store = recordShown(emptyStore(), "a", limits, now);
    expect(store.shown).toBe(1);
    expect(store.prompts.a.shown).toBe(1);
    expect(store.snoozedUntil).toBe(now + 14 * 24 * 60 * 60 * 1000);
    expect(store.snoozedSince).toBe(now);
  });

  it("reaches the ceiling after exactly as many showings as the limit allows", () => {
    let store = emptyStore();
    for (let round = 0; round < limits.maxShown; round += 1) {
      store = recordShown(store, `p${round}`, limits, now);
    }
    expect(choosePrompt([candidate("new")], store, limits, { viewed: 99, liked: 99 }, now + 10 ** 12)).toBeNull();
  });
});

describe("recordDismissed", () => {
  it("treats one dismissal as not now rather than as no", () => {
    const store = recordDismissed(emptyStore(), "a", limits, now);
    expect(store.prompts.a.resolved).toBe(false);
    expect(store.snoozedUntil).toBe(now + 90 * 24 * 60 * 60 * 1000);
  });

  it("stops asking after the third dismissal of the same prompt", () => {
    let store = emptyStore();
    for (let round = 0; round < limits.dismissalsUntilResolved; round += 1) {
      store = recordDismissed(store, "a", limits, now);
    }
    expect(store.prompts.a.resolved).toBe(true);
  });

  it("reads both figures from the settings rather than from the code", () => {
    // The operator owns these. A stricter setting has to bite at once, and a
    // looser one has to stop biting.
    const strict = { ...limits, dismissSnoozeDays: 7, dismissalsUntilResolved: 1 };
    const once = recordDismissed(emptyStore(), "a", strict, now);
    expect(once.snoozedUntil).toBe(now + 7 * 24 * 60 * 60 * 1000);
    expect(once.prompts.a.resolved).toBe(true);

    const lenient = { ...limits, dismissSnoozeDays: 0, dismissalsUntilResolved: 9 };
    const soft = recordDismissed(emptyStore(), "a", lenient, now);
    expect(soft.snoozedUntil).toBe(now);
    expect(soft.prompts.a.resolved).toBe(false);
  });

  it("never brings a quiet period forward", () => {
    const store = recordDismissed({ ...emptyStore(), snoozedUntil: now + 10 ** 12 }, "a", limits, now);
    expect(store.snoozedUntil).toBe(now + 10 ** 12);
  });
});

describe("countShopView", () => {
  it("counts a different shop", () => {
    const store = countShopView(emptyStore(), "eine-werkstatt");
    expect(store.shopViews).toBe(1);
    expect(store.lastShopSlug).toBe("eine-werkstatt");
  });

  it("does not count a reload of the same shop", () => {
    const first = countShopView(emptyStore(), "eine-werkstatt");
    const again = countShopView(first, "eine-werkstatt");
    expect(again.shopViews).toBe(1);
    expect(again).toBe(first);
  });
});

describe("parseStore", () => {
  it("returns an empty store for nothing, for rubbish, and for the wrong shape", () => {
    expect(parseStore(null, [])).toEqual(emptyStore());
    expect(parseStore("{not json", [])).toEqual(emptyStore());
    expect(parseStore('"a string"', [])).toEqual(emptyStore());
  });

  it("drops what it cannot read rather than failing", () => {
    const store = parseStore('{"shown":"viele","prompts":{"a":null}}', ["a"]);
    expect(store.shown).toBe(0);
    expect(store.prompts).toEqual({});
  });

  it("forgets prompts that no longer exist", () => {
    const raw = JSON.stringify({
      shown: 2,
      prompts: { alive: { shown: 1, dismissed: 0, resolved: false }, gone: { shown: 5 } },
    });
    const store = parseStore(raw, ["alive"]);
    expect(Object.keys(store.prompts)).toEqual(["alive"]);
    expect(store.shown).toBe(2);
  });
});
