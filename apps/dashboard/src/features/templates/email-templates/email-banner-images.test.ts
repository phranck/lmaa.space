import { describe, expect, it } from "vitest";

import type { MediaAsset } from "@lmaa/shared";

import { isEmailBannerImage } from "@/features/templates/email-templates/email-banner-images.ts";

function asset(overrides: Pick<MediaAsset, "kind" | "mimeType">): MediaAsset {
  return {
    id: 1,
    displayName: "banner",
    originalName: "banner",
    storedFilename: "banner",
    alias: null,
    sizeBytes: 1,
    width: 1200,
    height: 300,
    folderId: null,
    url: "https://media.example/banner",
    posterUrl: null,
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
    createdByUsername: null,
    ...overrides,
  };
}

describe("isEmailBannerImage", () => {
  it("accepts the image types every email client shows", () => {
    for (const mimeType of ["image/jpeg", "image/png", "image/gif"]) {
      expect(isEmailBannerImage(asset({ kind: "image", mimeType }))).toBe(true);
    }
  });

  it("leaves out the image types Outlook for Windows cannot show", () => {
    for (const mimeType of ["image/webp", "image/avif"]) {
      expect(isEmailBannerImage(asset({ kind: "image", mimeType }))).toBe(false);
    }
  });

  it("leaves out assets that are not images", () => {
    expect(isEmailBannerImage(asset({ kind: "document", mimeType: "image/png" }))).toBe(false);
  });
});
