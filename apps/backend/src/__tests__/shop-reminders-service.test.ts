import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  advanceReminderDate: vi.fn(() => Promise.resolve()),
  claimDueReminders: vi.fn(),
  deleteReminderById: vi.fn(() => Promise.resolve()),
}));

const mailMocks = vi.hoisted(() => ({ sendMail: vi.fn(() => Promise.resolve(true)) }));
const pushMocks = vi.hoisted(() => ({ sendPushNotification: vi.fn(() => Promise.resolve()) }));
const rendererMocks = vi.hoisted(() => ({
  renderEmailTemplate: vi.fn(() => ({ subject: "s", html: "<p>h</p>" })),
}));
const backgroundErrorMocks = vi.hoisted(() => ({
  recordBackgroundError: vi.fn(() => Promise.resolve()),
}));

vi.mock("../repositories/shop-reminders.js", () => repoMocks);
vi.mock("../services/email.js", () => mailMocks);
vi.mock("./email.js", () => mailMocks);
vi.mock("../services/push-notifications.js", () => pushMocks);
vi.mock("./push-notifications.js", () => pushMocks);
vi.mock("../services/email-renderer.js", () => rendererMocks);
vi.mock("./email-renderer.js", () => rendererMocks);
vi.mock("../services/background-errors.js", () => backgroundErrorMocks);
vi.mock("./background-errors.js", () => backgroundErrorMocks);
vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { REMINDER_LEASE_MS, processReminders } = await import("../services/shop-reminders.js");

function makeDueReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    shopId: 10,
    shopName: "Good Karma Coffee",
    adminId: 3,
    adminEmail: "admin@example.com",
    remindAt: new Date("2026-08-21T09:00:00.000Z"),
    note: null,
    recurrence: "never" as const,
    recurrenceCustomDays: null,
    recurrenceUnit: null,
    recurrenceDaysOfWeek: null,
    sendEmail: true,
    emailTemplate: null,
    ...overrides,
  };
}

describe("processReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mailMocks.sendMail.mockResolvedValue(true);
  });

  it("claims reminders under a lease instead of reading them unprotected", async () => {
    repoMocks.claimDueReminders.mockResolvedValue([]);

    await processReminders();

    expect(repoMocks.claimDueReminders).toHaveBeenCalledWith(REMINDER_LEASE_MS);
    expect(REMINDER_LEASE_MS).toBeGreaterThan(0);
  });

  it("sends nothing when another container holds every claim", async () => {
    repoMocks.claimDueReminders.mockResolvedValue([]);

    await processReminders();

    expect(mailMocks.sendMail).not.toHaveBeenCalled();
    expect(pushMocks.sendPushNotification).not.toHaveBeenCalled();
    expect(repoMocks.advanceReminderDate).not.toHaveBeenCalled();
    expect(repoMocks.deleteReminderById).not.toHaveBeenCalled();
  });

  it("processes exactly the reminders the claim returned", async () => {
    repoMocks.claimDueReminders.mockResolvedValue([makeDueReminder()]);

    await processReminders();

    expect(mailMocks.sendMail).toHaveBeenCalledTimes(1);
    expect(pushMocks.sendPushNotification).toHaveBeenCalledTimes(1);
    expect(repoMocks.deleteReminderById).toHaveBeenCalledWith(1);
  });

  it("keeps a one-off reminder claimed until the send succeeds", async () => {
    mailMocks.sendMail.mockResolvedValue(false);
    repoMocks.claimDueReminders.mockResolvedValue([makeDueReminder()]);

    await processReminders();

    expect(repoMocks.deleteReminderById).not.toHaveBeenCalled();
    expect(repoMocks.advanceReminderDate).not.toHaveBeenCalled();
  });

  it("advances a recurring reminder and releases its claim", async () => {
    repoMocks.claimDueReminders.mockResolvedValue([makeDueReminder({ recurrence: "daily" })]);

    await processReminders();

    expect(repoMocks.advanceReminderDate).toHaveBeenCalledTimes(1);
    expect(repoMocks.advanceReminderDate).toHaveBeenCalledWith(1, expect.any(Date));
  });
});
