import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  createAdminUser: vi.fn(),
  deleteAdminUserAndSessions: vi.fn(),
  getAdminUserById: vi.fn(),
  listAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
}));

const emailTemplateMocks = vi.hoisted(() => ({
  getEmailTemplateById: vi.fn(),
}));

const emailRenderMocks = vi.hoisted(() => ({
  renderEmailTemplate: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

const inviteMocks = vi.hoisted(() => ({
  createAdminInviteToken: vi.fn(),
  getAdminInviteExpiresAt: vi.fn(),
  hashAdminInviteToken: vi.fn(),
}));

vi.mock("../repositories/admin-users.js", () => repoMocks);
vi.mock("../repositories/email-templates.js", () => emailTemplateMocks);
vi.mock("../services/email-renderer.js", () => emailRenderMocks);
vi.mock("../services/email.js", () => emailMocks);
vi.mock("../services/admin-invite.js", () => inviteMocks);
vi.mock("../config/env.js", () => ({
  env: {
    LOG_LEVEL: "info",
    NODE_ENV: "test",
    DASHBOARD_URL: "http://localhost:5174",
  },
}));

import { createManagedAdminUser } from "../services/admin-users.js";

describe("createManagedAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteMocks.createAdminInviteToken.mockReturnValue("invite-token");
    inviteMocks.hashAdminInviteToken.mockReturnValue("invite-hash");
    inviteMocks.getAdminInviteExpiresAt.mockReturnValue(new Date("2026-03-14T10:00:00.000Z"));
    repoMocks.createAdminUser.mockResolvedValue({
      id: 3,
      username: "mod",
      email: "mod@example.com",
      role: "moderator",
      firstName: null,
      lastName: null,
      avatarUrl: null,
      createdAt: new Date("2026-03-07T10:00:00.000Z"),
      lastLoginAt: null,
    });
    emailTemplateMocks.getEmailTemplateById.mockResolvedValue({
      id: 7,
      name: "Welcome",
    });
    emailRenderMocks.renderEmailTemplate.mockResolvedValue({
      subject: "Welcome",
      html: "<p>Hello</p>",
    });
    emailMocks.sendMail.mockResolvedValue(undefined);
  });

  it("creates a passwordless user with invite metadata and mails inviteUrl only", async () => {
    const result = await createManagedAdminUser({
      username: "mod",
      email: "mod@example.com",
      role: "moderator",
      welcomeTemplateId: 7,
    });

    expect(repoMocks.createAdminUser).toHaveBeenCalledWith({
      username: "mod",
      email: "mod@example.com",
      passwordHash: null,
      inviteTokenHash: "invite-hash",
      inviteExpiresAt: new Date("2026-03-14T10:00:00.000Z"),
      role: "moderator",
    });
    expect(emailRenderMocks.renderEmailTemplate).toHaveBeenCalledWith(
      { id: 7, name: "Welcome" },
      expect.objectContaining({
        username: "mod",
        email: "mod@example.com",
        loginUrl: "http://localhost:5174",
        inviteUrl: "http://localhost:5174/invite/invite-token",
      }),
    );
    expect(emailRenderMocks.renderEmailTemplate).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ password: expect.any(String) }),
    );
    expect(result).toEqual({
      user: {
        id: 3,
        username: "mod",
        email: "mod@example.com",
        role: "moderator",
        isOwner: false,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        createdAt: "2026-03-07T10:00:00.000Z",
        lastLoginAt: null,
      },
      inviteUrl: "http://localhost:5174/invite/invite-token",
    });
  });
});
