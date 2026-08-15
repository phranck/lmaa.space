import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { classifyError } from "../services/review/anthropic-provider.js";

describe("classifyError", () => {
  it("treats a cancelled request as a cancellation, not as a provider error", () => {
    // The SDK models a cancelled request as an API error without a status, so
    // the generic branch used to catch it, report "the provider answered with
    // an error" and retry. Two workers cancelling each other burnt a job's
    // attempts that way in production.
    const classified = classifyError(new Anthropic.APIUserAbortError());

    expect(classified.code).toBe("PROVIDER_ABORTED");
    expect(classified.retryable).toBe(false);
  });

  it("names the status and the provider's wording on any other API error", () => {
    const error = new Anthropic.APIError(
      503,
      { type: "error", error: { type: "overloaded_error", message: "Overloaded" } },
      "overloaded",
      new Headers(),
    );
    const classified = classifyError(error);

    expect(classified.code).toBe("PROVIDER_HTTP_503");
    expect(classified.message).toContain("503");
    expect(classified.message).toContain("Overloaded");
    expect(classified.retryable).toBe(true);
  });

  it("keeps a rejected request unrepeatable and quotes what was refused", () => {
    const error = new Anthropic.BadRequestError(
      400,
      { type: "error", error: { type: "invalid_request_error", message: "effort 'xhigh'" } },
      "bad request",
      new Headers(),
    );
    const classified = classifyError(error);

    expect(classified.code).toBe("PROVIDER_BAD_REQUEST");
    expect(classified.message).toContain("effort 'xhigh'");
    expect(classified.retryable).toBe(false);
  });
});
