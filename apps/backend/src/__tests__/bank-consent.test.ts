import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    OWNER_EMAIL: "owner@example.test",
    DASHBOARD_URL: "https://dashboard.example",
  },
}));

const mailMocks = vi.hoisted(() => ({ sendMail: vi.fn() }));
const pushMocks = vi.hoisted(() => ({ sendPushNotification: vi.fn() }));
const repositoryMocks = vi.hoisted(() => ({
  getLiveBankConnection: vi.fn(),
  setConsentNoticeStage: vi.fn(),
  getOwner: vi.fn(),
}));

vi.mock("../services/email.js", () => mailMocks);
vi.mock("../services/push-notifications.js", () => pushMocks);
vi.mock("../repositories/bank-connections.js", () => ({
  getLiveBankConnection: repositoryMocks.getLiveBankConnection,
  setConsentNoticeStage: repositoryMocks.setConsentNoticeStage,
}));
vi.mock("../repositories/admin-users.js", () => ({ getOwner: repositoryMocks.getOwner }));

import {
  announceConsentRefused,
  announceConsentStage,
  resolveConsentNoticeStage,
  shouldAnnounceStage,
} from "../services/bank-consent.js";

const NOW = new Date("2026-09-03T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

/** A consent lapsing this many days from `NOW`. */
function lapsingInDays(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_MS);
}

describe("which rung a lapsing consent has reached", () => {
  it("reaches none whilst there is plenty of time", () => {
    expect(resolveConsentNoticeStage(lapsingInDays(30), NOW)).toBeNull();
  });

  it("reaches none on the day before the first rung", () => {
    expect(resolveConsentNoticeStage(lapsingInDays(15), NOW)).toBeNull();
  });

  it("reaches the first rung a fortnight out", () => {
    expect(resolveConsentNoticeStage(lapsingInDays(13), NOW)).toBe("soon");
  });

  it("reaches the second rung three days out", () => {
    expect(resolveConsentNoticeStage(lapsingInDays(2), NOW)).toBe("imminent");
  });

  it("reaches the last rung at the very moment it lapses", () => {
    expect(resolveConsentNoticeStage(NOW, NOW)).toBe("lapsed");
  });

  it("reaches none where the bank promised no date", () => {
    // Nothing was promised, which is not the same as something running out.
    expect(resolveConsentNoticeStage(null, NOW)).toBeNull();
  });
});

describe("whether a rung still has to be announced", () => {
  it("announces the first one reached", () => {
    expect(shouldAnnounceStage("soon", null)).toBe(true);
  });

  it("stays quiet about one already said", () => {
    expect(shouldAnnounceStage("soon", "soon")).toBe(false);
  });

  it("announces the next one along", () => {
    expect(shouldAnnounceStage("imminent", "soon")).toBe(true);
  });

  it("never goes back down the staircase", () => {
    // A consent cannot un-lapse, and repeating what was said is the failure
    // this whole arrangement exists to prevent.
    expect(shouldAnnounceStage("soon", "lapsed")).toBe(false);
    expect(shouldAnnounceStage("imminent", "lapsed")).toBe(false);
  });

  it("says nothing where no rung is reached", () => {
    expect(shouldAnnounceStage(null, null)).toBe(false);
    expect(shouldAnnounceStage(null, "soon")).toBe(false);
  });
});

describe("warning the owner", () => {
  const connection = {
    id: "c1",
    consentValidUntil: lapsingInDays(2),
    consentNoticeStage: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.getLiveBankConnection.mockResolvedValue({ ...connection });
    repositoryMocks.getOwner.mockResolvedValue({ id: 1 });
    mailMocks.sendMail.mockResolvedValue(true);
    pushMocks.sendPushNotification.mockResolvedValue(undefined);
  });

  it("writes and pushes once, and records what it said", async () => {
    await announceConsentStage(NOW);

    expect(mailMocks.sendMail).toHaveBeenCalledTimes(1);
    expect(pushMocks.sendPushNotification).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.setConsentNoticeStage).toHaveBeenCalledWith("c1", "imminent");
  });

  it("says nothing a second time for the same rung", async () => {
    repositoryMocks.getLiveBankConnection.mockResolvedValue({
      ...connection,
      consentNoticeStage: "imminent",
    });

    await announceConsentStage(NOW);

    expect(mailMocks.sendMail).not.toHaveBeenCalled();
    expect(repositoryMocks.setConsentNoticeStage).not.toHaveBeenCalled();
  });

  it("records the rung only after it has gone out", async () => {
    // A warning that failed to send is tried again at the next tick rather than
    // counted as said.
    mailMocks.sendMail.mockRejectedValue(new Error("smtp refused"));

    await expect(announceConsentStage(NOW)).rejects.toThrow();
    expect(repositoryMocks.setConsentNoticeStage).not.toHaveBeenCalled();
  });

  it("says nothing at all whilst no connection is in force", async () => {
    repositoryMocks.getLiveBankConnection.mockResolvedValue(null);

    await announceConsentStage(NOW);

    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  it("warns on a refused read even where the stored date said there was time", async () => {
    // The date is what the bank promised. It may withdraw earlier, and then a
    // refused read is the only thing that says so.
    repositoryMocks.getLiveBankConnection.mockResolvedValue({
      ...connection,
      consentValidUntil: lapsingInDays(60),
    });

    await announceConsentRefused();

    expect(mailMocks.sendMail).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.setConsentNoticeStage).toHaveBeenCalledWith("c1", "lapsed");
  });

  it("does not repeat itself when both the date and a refused read notice", async () => {
    repositoryMocks.getLiveBankConnection.mockResolvedValue({
      ...connection,
      consentNoticeStage: "lapsed",
    });

    await announceConsentRefused();
    await announceConsentStage(NOW);

    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });
});
