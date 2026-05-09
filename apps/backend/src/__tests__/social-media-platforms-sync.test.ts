import { describe, expect, it } from "vitest";

import {
  POSTING_PLATFORM_KEYS,
  SOCIAL_MEDIA_PLATFORM_KEYS,
  SOCIAL_MEDIA_PLATFORMS,
} from "@lmaa/contracts";
import { SOCIAL_PLATFORM_KEYS } from "@lmaa/shared";

describe("social media platform constants", () => {
  it("keeps contract platform keys sourced from shared constants", () => {
    expect(SOCIAL_MEDIA_PLATFORM_KEYS).toEqual(SOCIAL_PLATFORM_KEYS);
  });

  it("keeps post-template platforms aligned with posting account platforms", () => {
    expect(SOCIAL_MEDIA_PLATFORMS).toEqual(POSTING_PLATFORM_KEYS);
  });
});
