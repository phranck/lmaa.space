import { describe, expect, it } from "vitest";

import {
  choosePrompt,
  countShopView,
  DISMISSALS_UNTIL_RESOLVED,
  emptyStore,
  parseStore,
  recordDismissed,
  recordResolved,
  recordShown,
} from "./support-prompt-store.js";

const limits = { maxShown: 4, snoozeDays: 14 };
const now = 1_700_000_000_000;

function candidate(id: string, threshold = 0, priority = 0) {
  return { id, threshold, priority };
}

describe("choosePrompt", () => {
  it("shows nothing once the reader has seen enough", () => {
    const store = { ...emptyStore(), shown: 4 };
    expect(choosePrompt([candidate("a")], store, limits, 10, now)).toBeNull();
  });

  it("shows nothing whilst the site is meant to be quiet", () => {
    const store = { ...emptyStore(), snoozedUntil: now + 1000 };
    expect(choosePrompt([candidate("a")], store, limits, 10, now)).toBeNull();
  });

  it("waits until the reader has reached the threshold", () => {
    expect(choosePrompt([candidate("a", 3)], emptyStore(), limits, 2, now)).toBeNull();
    expect(choosePrompt([candidate("a", 3)], emptyStore(), limits, 3, now)?.id).toBe("a");
  });

  it("skips a prompt this reader is done with", () => {
    const store = recordResolved(emptyStore(), "a");
    expect(choosePrompt([candidate("a"), candidate("b")], store, limits, 9, now)?.id).toBe("b");
  });

  it("prefers the higher priority", () => {
    const chosen = choosePrompt(
      [candidate("a", 0, 1), candidate("b", 0, 7), candidate("c", 0, 3)],
      emptyStore(),
      limits,
      9,
      now,
    );
    expect(chosen?.id).toBe("b");
  });

  it("keeps the order the server sent when two carry the same priority", () => {
    const chosen = choosePrompt(
      [candidate("first", 0, 5), candidate("second", 0, 5)],
      emptyStore(),
      limits,
      9,
      now,
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
  });

  it("reaches the ceiling after exactly as many showings as the limit allows", () => {
    let store = emptyStore();
    for (let round = 0; round < limits.maxShown; round += 1) {
      store = recordShown(store, `p${round}`, limits, now);
    }
    expect(choosePrompt([candidate("new")], store, limits, 99, now + 10 ** 12)).toBeNull();
  });
});

describe("recordDismissed", () => {
  it("treats one dismissal as not now rather than as no", () => {
    const store = recordDismissed(emptyStore(), "a", now);
    expect(store.prompts.a.resolved).toBe(false);
    expect(store.snoozedUntil).toBe(now + 90 * 24 * 60 * 60 * 1000);
  });

  it("stops asking after the third dismissal of the same prompt", () => {
    let store = emptyStore();
    for (let round = 0; round < DISMISSALS_UNTIL_RESOLVED; round += 1) {
      store = recordDismissed(store, "a", now);
    }
    expect(store.prompts.a.resolved).toBe(true);
  });

  it("never brings a quiet period forward", () => {
    const store = recordDismissed({ ...emptyStore(), snoozedUntil: now + 10 ** 12 }, "a", now);
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
