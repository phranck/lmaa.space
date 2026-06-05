import { describe, expect, it, vi } from "vitest";

import {
  createContentPreviewSession,
  getContentPreviewSession,
} from "../services/content-preview-store.js";

describe("content preview store", () => {
  it("stores and resolves a short-lived preview payload", () => {
    const payload = {
      slug: "draft-page",
      title: "Draft Page",
      content: "# Draft",
      showTitle: true,
    };

    const session = createContentPreviewSession(payload);

    expect(session.token).toMatch(/^[0-9a-f]{32}$/);
    expect(getContentPreviewSession(session.token)).toEqual(payload);
  });

  it("expires preview payloads", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));

    const session = createContentPreviewSession({
      slug: "draft-page",
      title: "Draft Page",
      content: "# Draft",
      showTitle: true,
    });

    vi.setSystemTime(new Date("2026-06-05T12:16:00.000Z"));

    expect(getContentPreviewSession(session.token)).toBeNull();
    vi.useRealTimers();
  });
});
