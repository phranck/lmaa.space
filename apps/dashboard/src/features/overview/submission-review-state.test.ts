import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_REVIEW_STATE, reviewReducer } from "./submission-review-state";

function installLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  });
}

describe("reviewReducer", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installLocalStorage();
  });

  it("opens approval mode with the persisted notification template", () => {
    localStorage.setItem("submissions:notification-template:approved", "42");

    expect(
      reviewReducer(EMPTY_REVIEW_STATE, { type: "openApprove", adminNote: "Looks good" }),
    ).toEqual({
      ...EMPTY_REVIEW_STATE,
      reviewMode: "approve",
      adminNote: "Looks good",
      notificationTemplateId: 42,
    });
  });

  it("persists and clears the selected rejection template", () => {
    const state = reviewReducer(EMPTY_REVIEW_STATE, {
      type: "openReject",
      adminNote: "No",
      editingRejection: true,
      rejectionLongText: "Long reason",
      rejectionToken: "abc",
    });

    const selected = reviewReducer(state, { type: "setNotificationTemplateId", value: 7 });
    expect(selected.notificationTemplateId).toBe(7);
    expect(localStorage.getItem("submissions:notification-template:rejected")).toBe("7");

    const cleared = reviewReducer(selected, {
      type: "setNotificationTemplateId",
      value: undefined,
    });
    expect(cleared.notificationTemplateId).toBeUndefined();
    expect(localStorage.getItem("submissions:notification-template:rejected")).toBeNull();
  });
});
