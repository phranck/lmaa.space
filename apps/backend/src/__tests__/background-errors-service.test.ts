import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const insertBackgroundErrorMock = vi.fn();
const loggerMock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

async function loadService() {
  vi.resetModules();

  vi.doMock("../lib/logger.js", () => ({ logger: loggerMock }));
  vi.doMock("../repositories/background-errors.js", () => ({
    insertBackgroundError: insertBackgroundErrorMock,
  }));

  return import("../services/background-errors.js");
}

describe("recordBackgroundError", () => {
  beforeEach(() => {
    insertBackgroundErrorMock.mockReset();
    loggerMock.error.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("happy path: logs the error and inserts a row — returns void without throwing", async () => {
    insertBackgroundErrorMock.mockResolvedValue(undefined);

    const { recordBackgroundError } = await loadService();
    const err = new Error("something went wrong");

    await expect(
      recordBackgroundError("mastodon-post", err, { accountId: 5 }),
    ).resolves.toBeUndefined();

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ err, source: "mastodon-post", accountId: 5 }),
      "background error recorded",
    );
    expect(insertBackgroundErrorMock).toHaveBeenCalledWith({
      source: "mastodon-post",
      message: "something went wrong",
      context: { accountId: 5 },
    });
  });

  it("happy path: non-Error value is stringified as message", async () => {
    insertBackgroundErrorMock.mockResolvedValue(undefined);

    const { recordBackgroundError } = await loadService();

    await recordBackgroundError("shop-reminders", "plain string error");

    expect(insertBackgroundErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "plain string error" }),
    );
  });

  it("stores structured provider errors as readable messages with details", async () => {
    insertBackgroundErrorMock.mockResolvedValue(undefined);

    const { recordBackgroundError } = await loadService();

    await recordBackgroundError(
      "email",
      {
        name: "validation_error",
        message: "Invalid `from` field.",
        statusCode: 403,
      },
      { to: "owner@example.test", subject: "Neue Einreichung" },
    );

    expect(insertBackgroundErrorMock).toHaveBeenCalledWith({
      source: "email",
      message: "validation_error: Invalid `from` field. (403)",
      context: {
        to: "owner@example.test",
        subject: "Neue Einreichung",
        error: {
          name: "validation_error",
          message: "Invalid `from` field.",
          statusCode: 403,
        },
      },
    });
  });

  it("redacts sensitive values before persisting context and structured errors", async () => {
    insertBackgroundErrorMock.mockResolvedValue(undefined);

    const { recordBackgroundError } = await loadService();

    await recordBackgroundError(
      "email",
      { message: "Request failed", apiKey: "re_secret" },
      { accessToken: "secret-token", safe: "visible" },
    );

    expect(insertBackgroundErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          accessToken: "[redacted]",
          safe: "visible",
          error: {
            message: "Request failed",
            apiKey: "[redacted]",
          },
        },
      }),
    );
  });

  it("DB failure path: logs insert error via logger.error, does not throw", async () => {
    insertBackgroundErrorMock.mockRejectedValue(new Error("DB connection lost"));

    const { recordBackgroundError } = await loadService();
    const err = new Error("original error");

    await expect(recordBackgroundError("mastodon-post", err)).resolves.toBeUndefined();

    // Should have two error calls: first the original record, then the insert failure
    expect(loggerMock.error).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error), source: "mastodon-post" }),
      "failed to persist background error",
    );
  });

  it("context defaults to null in insert when not provided", async () => {
    insertBackgroundErrorMock.mockResolvedValue(undefined);

    const { recordBackgroundError } = await loadService();

    await recordBackgroundError("mastodon-post", new Error("err without context"));

    expect(insertBackgroundErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ context: null }),
    );
  });
});
