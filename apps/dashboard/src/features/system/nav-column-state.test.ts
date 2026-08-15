import { describe, expect, it } from "vitest";

import { navColumnReducer, type NavColumnState } from "./nav-column-state.ts";

const base: NavColumnState = {
  items: [],
  dirty: false,
  addType: "page",
  addPageSlug: "",
  addUrl: "",
  addLabel: "",
  addTarget: "_self",
};

describe("navColumnReducer", () => {
  it("returns the very same state when nothing changes", () => {
    // The page writes the loaded navigation into the state on every render
    // whilst the query has no data. A reducer that copies would hand React a
    // new object each time, React would render again, and the page would never
    // settle: that is React error 185.
    const next = navColumnReducer(base, { items: base.items, dirty: false });

    expect(next).toBe(base);
  });

  it("returns a new state when something does change", () => {
    const next = navColumnReducer(base, { dirty: true });

    expect(next).not.toBe(base);
    expect(next.dirty).toBe(true);
    expect(next.items).toBe(base.items);
  });

  it("treats a fresh but equal array as a change, which is why the empty list is a constant", () => {
    // Identity is all a reducer can compare, so the page must not hand it a new
    // array on every render. That is what NO_NAV_ITEMS is for.
    const next = navColumnReducer(base, { items: [] });

    expect(next).not.toBe(base);
  });
});
