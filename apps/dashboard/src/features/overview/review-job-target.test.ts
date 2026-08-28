import { describe, expect, it } from "vitest";

import { reviewJobTarget } from "@/features/overview/review-job-target.ts";

describe("reviewJobTarget", () => {
  it("leads to the shop once the suggestion has been admitted", () => {
    expect(reviewJobTarget({ submissionId: 12, shopId: 340 })).toBe("/shops/340");
  });

  it("leads to the suggestion whilst it is still under moderation", () => {
    expect(reviewJobTarget({ submissionId: 12, shopId: null })).toBe("/reports/suggestions/12");
  });

  it("leads to the suggestion when the shop id is missing from the response", () => {
    expect(reviewJobTarget({ submissionId: 12, shopId: undefined as unknown as null })).toBe(
      "/reports/suggestions/12",
    );
  });
});
