import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseTableSortFromSearchParams,
  readStoredTableSort,
  writeStoredTableSort,
} from "./table-sort-storage";

const SORTABLE_COLUMNS = new Set(["name", "submitted"]);

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

describe("table sort storage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installLocalStorage();
  });

  it("parses valid query parameters", () => {
    const searchParams = new URLSearchParams("sort=name&dir=desc");

    expect(parseTableSortFromSearchParams(searchParams, SORTABLE_COLUMNS)).toEqual({
      id: "name",
      dir: "desc",
    });
  });

  it("rejects unsupported query parameters", () => {
    expect(
      parseTableSortFromSearchParams(
        new URLSearchParams("sort=unknown&dir=asc"),
        SORTABLE_COLUMNS,
      ),
    ).toBeNull();
    expect(
      parseTableSortFromSearchParams(
        new URLSearchParams("sort=name&dir=sideways"),
        SORTABLE_COLUMNS,
      ),
    ).toBeNull();
  });

  it("persists and restores a valid sort", () => {
    writeStoredTableSort("table:sort", { id: "submitted", dir: "asc" }, SORTABLE_COLUMNS);

    expect(readStoredTableSort("table:sort", SORTABLE_COLUMNS)).toEqual({
      id: "submitted",
      dir: "asc",
    });
  });

  it("persists the explicitly unsorted state", () => {
    writeStoredTableSort("table:sort", null, SORTABLE_COLUMNS);

    expect(readStoredTableSort("table:sort", SORTABLE_COLUMNS)).toBeNull();
  });

  it("removes invalid stored payloads", () => {
    localStorage.setItem("table:sort", JSON.stringify({ version: 1, sort: { id: "x", dir: "asc" } }));

    expect(readStoredTableSort("table:sort", SORTABLE_COLUMNS)).toBeUndefined();
    expect(localStorage.getItem("table:sort")).toBeNull();
  });
});
