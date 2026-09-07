import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyShopsVisibilityFilterSearchParam,
  parseShopsSort,
  parseShopsVisibilityFilter,
  readStoredShopsVisibilityFilter,
  shopsFilterReducer,
  writeStoredShopsVisibilityFilter,
  INITIAL_FILTER_STATE,
  SHOP_SORTABLE_COLUMNS,
} from "./shop-filter-state";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  };
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", { localStorage: localStorageMock });
}

describe("shop filter state", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installLocalStorage();
  });

  // The sort travels through the address bar, so a column the parser does not
  // recognise loses its sort on the way back and the header reacts to a click
  // without sorting anything. Every sortable column is checked rather than the
  // one that was missing, because the next one added will be missing the same
  // way.
  it.each([...SHOP_SORTABLE_COLUMNS])("keeps a sort by %s across the address bar", (column) => {
    expect(parseShopsSort(new URLSearchParams(`sort=${column}&dir=desc`))).toEqual({
      id: column,
      dir: "desc",
    });
  });

  it("sorts by the date column", () => {
    expect(parseShopsSort(new URLSearchParams("sort=date&dir=asc"))).toEqual({
      id: "date",
      dir: "asc",
    });
  });

  it("discards a column that does not exist", () => {
    expect(parseShopsSort(new URLSearchParams("sort=nothing&dir=asc"))).toBeNull();
  });

  it("parses supported visibility filters", () => {
    expect(parseShopsVisibilityFilter("all")).toBe("all");
    expect(parseShopsVisibilityFilter("public")).toBe("public");
    expect(parseShopsVisibilityFilter("onhold")).toBe("onhold");
    expect(parseShopsVisibilityFilter("deleted")).toBe("deleted");
    expect(parseShopsVisibilityFilter("rejected")).toBe("rejected");
  });

  it("rejects unsupported visibility filters", () => {
    expect(parseShopsVisibilityFilter("archived")).toBeNull();
    expect(parseShopsVisibilityFilter("")).toBeNull();
    expect(parseShopsVisibilityFilter(null)).toBeNull();
  });

  it("persists and restores the selected visibility filter", () => {
    writeStoredShopsVisibilityFilter("shops:visibility", "deleted");

    expect(readStoredShopsVisibilityFilter("shops:visibility")).toBe("deleted");
  });

  it("removes invalid stored values", () => {
    localStorage.setItem("shops:visibility", "archived");

    expect(readStoredShopsVisibilityFilter("shops:visibility")).toBeNull();
    expect(localStorage.getItem("shops:visibility")).toBeNull();
  });

  it("keeps non-default visibility in search params", () => {
    const nextParams = applyShopsVisibilityFilterSearchParam(
      new URLSearchParams("q=foo&sort=name&dir=asc"),
      "deleted",
    );

    expect(nextParams.toString()).toBe("q=foo&sort=name&dir=asc&visibility=deleted");
  });

  it("removes default public visibility from search params", () => {
    const nextParams = applyShopsVisibilityFilterSearchParam(
      new URLSearchParams("q=foo&visibility=deleted"),
      "public",
    );

    expect(nextParams.toString()).toBe("q=foo");
  });

  it("stores selected deleted visibility in the reducer", () => {
    expect(
      shopsFilterReducer(INITIAL_FILTER_STATE, {
        type: "setVisibilityFilter",
        value: "deleted",
      }).visibilityFilter,
    ).toBe("deleted");
  });
});
