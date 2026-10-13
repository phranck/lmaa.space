import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordBackgroundError } from "../services/background-errors.js";

const loggerMocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("../lib/logger.js", () => ({ logger: loggerMocks }));

describe("recordBackgroundError", () => {
  beforeEach(() => {
    loggerMocks.error.mockClear();
  });

  it("logs a thrown array as JSON", async () => {
    await recordBackgroundError("review", ["first", "second"]);

    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: '["first","second"]', source: "review" }),
      "background job failed",
    );
  });

  it("logs a thrown number as itself", async () => {
    await recordBackgroundError("review", 42);

    expect(loggerMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: "42" }),
      "background job failed",
    );
  });
});
