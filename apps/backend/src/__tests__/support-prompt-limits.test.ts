import { beforeEach, describe, expect, it, vi } from "vitest";

const settingsMocks = vi.hoisted(() => ({ getSetting: vi.fn(), putSetting: vi.fn() }));
vi.mock("../repositories/app-settings.js", () => settingsMocks);

const loggerMocks = vi.hoisted(() => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../lib/logger.js", () => loggerMocks);

import { getSupportPromptLimits } from "../services/support-prompts.js";

const DEFAULTS = { maxShown: 4, snoozeDays: 14, devAlwaysShow: false };

describe("getSupportPromptLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("answers with what was stored when all of it reads", async () => {
    settingsMocks.getSetting.mockResolvedValue(JSON.stringify({ maxShown: 8, snoozeDays: 0 }));

    expect(await getSupportPromptLimits()).toEqual({
      maxShown: 8,
      snoozeDays: 0,
      devAlwaysShow: false,
    });
    expect(loggerMocks.logger.warn).not.toHaveBeenCalled();
  });

  it("keeps the fields that read when one of them does not", async () => {
    // The case that costs somebody their settings: one value stops being valid
    // because a rule changed, and everything beside it is thrown away with it.
    settingsMocks.getSetting.mockResolvedValue(JSON.stringify({ maxShown: 8, snoozeDays: 9999 }));

    const limits = await getSupportPromptLimits();

    expect(limits.maxShown).toBe(8);
    expect(limits.snoozeDays).toBe(DEFAULTS.snoozeDays);
  });

  it("says in the log what it dropped and what it kept", async () => {
    settingsMocks.getSetting.mockResolvedValue(JSON.stringify({ maxShown: 8, snoozeDays: 9999 }));

    await getSupportPromptLimits();

    expect(loggerMocks.logger.warn).toHaveBeenCalledTimes(1);
    const [details] = loggerMocks.logger.warn.mock.calls[0];
    expect(details.dropped).toEqual(["snoozeDays=9999"]);
    expect(details.kept).toEqual({
      maxShown: 8,
      snoozeDays: DEFAULTS.snoozeDays,
      devAlwaysShow: false,
    });
  });

  it("falls back for a field that was never stored, without calling it dropped", async () => {
    settingsMocks.getSetting.mockResolvedValue(JSON.stringify({ maxShown: 99 }));

    const limits = await getSupportPromptLimits();

    expect(limits.snoozeDays).toBe(DEFAULTS.snoozeDays);
    expect(loggerMocks.logger.warn.mock.calls[0][0].dropped).toEqual(["maxShown=99"]);
  });

  it("answers with the defaults when nothing is stored", async () => {
    settingsMocks.getSetting.mockResolvedValue(null);

    expect(await getSupportPromptLimits()).toEqual(DEFAULTS);
    expect(loggerMocks.logger.warn).not.toHaveBeenCalled();
  });

  it("answers with the defaults and says so when the value is not readable at all", async () => {
    settingsMocks.getSetting.mockResolvedValue("{not json");

    expect(await getSupportPromptLimits()).toEqual(DEFAULTS);
    expect(loggerMocks.logger.warn).toHaveBeenCalledTimes(1);
  });
});
