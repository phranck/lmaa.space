import { describe, expect, it } from "vitest";

import { formatBytes } from "@/features/system/media/media-utils.ts";

describe("formatBytes", () => {
  it("keeps the default compact formatting", () => {
    expect(formatBytes(1024 * 1024, "de")).toBe("1 MB");
  });

  it("can force a single fractional digit for upload progress", () => {
    expect(formatBytes(1024 * 1024, "de", { fixedFractionDigits: 1 })).toBe("1,0 MB");
    expect(formatBytes(1024 * 1024, "en", { fixedFractionDigits: 1 })).toBe("1.0 MB");
  });
});
