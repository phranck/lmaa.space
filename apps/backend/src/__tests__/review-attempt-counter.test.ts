import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({ db: {} }));

import { attemptAfterClaim } from "../repositories/review-jobs.js";

describe("what a claim does to the attempt counter", () => {
  it("counts an attempt where the job has no batch yet", () => {
    // Nothing has been asked of the provider, so this claim is the ask.
    expect(attemptAfterClaim(0, null)).toBe(1);
  });

  it("counts nothing where the job is resuming a batch", () => {
    // Two containers exist during a deployment, so the new one takes the job
    // over whilst the old one is still waiting. A batch runs for up to ninety
    // minutes against a lease of twenty, so this happened on every deployment.
    expect(attemptAfterClaim(3, "msgbatch_01F7LSRqwyhZQmTQRanfybiT")).toBe(3);
  });

  it("still lets a job that keeps failing reach its ceiling", () => {
    // A check that fails on its own terms clears its batch id as it fails, so
    // the next claim counts and the job ends where it should.
    let attempt = 0;
    for (let round = 0; round < 5; round += 1) attempt = attemptAfterClaim(attempt, null);

    expect(attempt).toBe(5);
  });

  it("would have left job 38 at one attempt rather than five", () => {
    // The real sequence: submitted, resumed, resumed, and two claims after
    // aborts that left the batch id in place.
    const claims: (string | null)[] = [
      null,
      "msgbatch_01F7LSRqwyhZQmTQRanfybiT",
      "msgbatch_01F7LSRqwyhZQmTQRanfybiT",
      "msgbatch_01MftBLZHaqX5ev7bwPFPUeT",
      "msgbatch_01MftBLZHaqX5ev7bwPFPUeT",
    ];

    expect(claims.reduce<number>((attempt, batch) => attemptAfterClaim(attempt, batch), 0)).toBe(1);
  });
});
