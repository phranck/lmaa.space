import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applySuggestionsStatusFilterSearchParam,
  parseSuggestionsStatusFilter,
  readStoredSuggestionsStatusFilter,
  writeStoredSuggestionsStatusFilter,
} from "./submission-status-filter";

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

describe("submission status filter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installLocalStorage();
  });

  it("parses supported filter statuses", () => {
    expect(parseSuggestionsStatusFilter("pending")).toBe("pending");
    expect(parseSuggestionsStatusFilter("onhold")).toBe("onhold");
    expect(parseSuggestionsStatusFilter("rejected")).toBe("rejected");
  });

  it("rejects unsupported statuses", () => {
    expect(parseSuggestionsStatusFilter("approved")).toBeNull();
    expect(parseSuggestionsStatusFilter("")).toBeNull();
    expect(parseSuggestionsStatusFilter(null)).toBeNull();
  });

  it("persists and restores the selected status", () => {
    writeStoredSuggestionsStatusFilter("submissions:status", "onhold");

    expect(readStoredSuggestionsStatusFilter("submissions:status")).toBe("onhold");
  });

  it("removes invalid stored values", () => {
    localStorage.setItem("submissions:status", "approved");

    expect(readStoredSuggestionsStatusFilter("submissions:status")).toBeNull();
    expect(localStorage.getItem("submissions:status")).toBeNull();
  });

  it("keeps non-default status in search params", () => {
    const nextParams = applySuggestionsStatusFilterSearchParam(
      new URLSearchParams("sort=submitted&dir=desc"),
      "onhold",
    );

    expect(nextParams.toString()).toBe("sort=submitted&dir=desc&status=onhold");
  });

  it("removes default pending status from search params", () => {
    const nextParams = applySuggestionsStatusFilterSearchParam(
      new URLSearchParams("sort=submitted&dir=desc&status=rejected"),
      "pending",
    );

    expect(nextParams.toString()).toBe("sort=submitted&dir=desc");
  });
});
