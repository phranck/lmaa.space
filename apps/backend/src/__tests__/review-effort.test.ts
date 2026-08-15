import { describe, expect, it } from "vitest";

import { REVIEW_EFFORT_LEVELS, resolveEffortLevel } from "@lmaa/shared";

/** What Claude Sonnet 4.6 reports about itself, which is the case this guards. */
const SONNET_4_6 = ["low", "medium", "high", "max"];

describe("resolveEffortLevel", () => {
  it("keeps a level the model accepts", () => {
    expect(resolveEffortLevel(SONNET_4_6, "high")).toBe("high");
    expect(resolveEffortLevel(SONNET_4_6, "max")).toBe("max");
  });

  it("steps down to the next accepted level rather than up", () => {
    // Sonnet 4.6 accepts `max` but not `xhigh`. Stepping up would spend more
    // than was configured, so the answer is `high`.
    expect(resolveEffortLevel(SONNET_4_6, "xhigh")).toBe("high");
  });

  it("takes the cheapest accepted level when none is below the chosen one", () => {
    expect(resolveEffortLevel(["high", "max"], "low")).toBe("high");
  });

  it("answers with no level for a model that takes none", () => {
    // Claude Sonnet 4.5 reports no effort at all. Sending one anyway is the
    // second way this ran into a 400.
    expect(resolveEffortLevel([], "xhigh")).toBeNull();
  });

  it("covers every level the settings offer", () => {
    for (const level of REVIEW_EFFORT_LEVELS) {
      expect(resolveEffortLevel([...REVIEW_EFFORT_LEVELS], level)).toBe(level);
    }
  });
});
