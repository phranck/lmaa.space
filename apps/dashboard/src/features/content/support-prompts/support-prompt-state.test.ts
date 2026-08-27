import { describe, expect, it } from "vitest";

import { promptState } from "./support-prompt-state.js";

const base = {
  id: "a",
  name: "Test",
  slot: "my-shops" as const,
  content: "",
  buttonLabel: "",
  buttonHref: "/support-me",
  buttonAlignment: "trailing" as const,
  threshold: 3,
  thresholdBasis: "viewed" as const,
  startsAt: null as string | null,
  endsAt: null as string | null,
  priority: 0,
  published: true,
  updatedAt: "2026-08-22T00:00:00.000Z",
};

describe("promptState", () => {
  it("calls an unpublished prompt a draft, whatever its window says", () => {
    expect(promptState({ ...base, published: false, startsAt: "2020-01-01" }, "2026-08-22")).toBe(
      "draft",
    );
  });

  it("waits until the window opens", () => {
    expect(promptState({ ...base, startsAt: "2026-12-01" }, "2026-08-22")).toBe("scheduled");
  });

  it("still runs on the last day it names", () => {
    expect(promptState({ ...base, endsAt: "2026-08-22" }, "2026-08-22")).toBe("live");
  });

  it("is over the day after", () => {
    expect(promptState({ ...base, endsAt: "2026-08-21" }, "2026-08-22")).toBe("expired");
  });

  it("runs without a window", () => {
    expect(promptState(base, "2026-08-22")).toBe("live");
  });
});
