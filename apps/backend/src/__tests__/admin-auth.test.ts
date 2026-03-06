import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  acceptInviteWithSession: vi.fn(),
  createOwnerAdminWithSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  findAdminByInviteTokenHash: vi.fn(),
  findAdminByUsername: vi.fn(),
  getAdminCount: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("../repositories/admin-auth.js", () => repoMocks);
vi.mock("../services/auth.js", () => authMocks);
vi.mock("../services/admin-invite.js", () => ({
  hashAdminInviteToken: vi.fn((token: string) => `hash:${token}`),
}));

import { acceptAdminInvite, getAdminInviteState, setupOwnerAdmin } from "../services/admin-auth.js";

describe("setupOwnerAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns already_setup when another owner wins the race", async () => {
    repoMocks.getAdminCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    authMocks.hashPassword.mockResolvedValue("hashed-password");
    repoMocks.createOwnerAdminWithSession.mockRejectedValue({ code: "23505" });

    const result = await setupOwnerAdmin({
      username: "owner",
      email: "owner@example.com",
      password: "super-secret-password",
    });

    expect(result).toEqual({ ok: false, reason: "already_setup" });
    expect(authMocks.hashPassword).toHaveBeenCalledWith("super-secret-password");
  });

  it("creates the owner and session when setup is still open", async () => {
    repoMocks.getAdminCount.mockResolvedValueOnce(0);
    authMocks.hashPassword.mockResolvedValue("hashed-password");
    repoMocks.createOwnerAdminWithSession.mockResolvedValue({
      admin: { id: 7, username: "owner", role: "owner" },
      sessionId: "session-123",
    });

    const result = await setupOwnerAdmin({
      username: "owner",
      email: "owner@example.com",
      password: "super-secret-password",
    });

    expect(result).toEqual({
      ok: true,
      sessionId: "session-123",
      admin: {
        id: 7,
        username: "owner",
        role: "owner",
        isOwner: true,
      },
    });
  });
});

describe("invite flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invite metadata for a valid token", async () => {
    repoMocks.findAdminByInviteTokenHash.mockResolvedValue({
      id: 5,
      username: "mod",
      email: "mod@example.com",
      role: "moderator",
      avatarUrl: null,
      inviteExpiresAt: new Date(Date.now() + 60_000),
    });

    const result = await getAdminInviteState("invite-token");

    expect(result).toEqual({
      ok: true,
      username: "mod",
      email: "mod@example.com",
    });
  });

  it("rejects expired invites", async () => {
    repoMocks.findAdminByInviteTokenHash.mockResolvedValue({
      id: 5,
      username: "mod",
      email: "mod@example.com",
      role: "moderator",
      avatarUrl: null,
      inviteExpiresAt: new Date(Date.now() - 60_000),
    });

    const result = await acceptAdminInvite({
      token: "invite-token",
      password: "super-secret-password",
    });

    expect(result).toEqual({ ok: false, reason: "expired_invite" });
    expect(authMocks.hashPassword).not.toHaveBeenCalled();
  });

  it("activates a valid invite and returns a session", async () => {
    repoMocks.findAdminByInviteTokenHash.mockResolvedValue({
      id: 5,
      username: "mod",
      email: "mod@example.com",
      role: "moderator",
      avatarUrl: "avatar.png",
      inviteExpiresAt: new Date(Date.now() + 60_000),
    });
    authMocks.hashPassword.mockResolvedValue("hashed-password");
    repoMocks.acceptInviteWithSession.mockResolvedValue({
      sessionId: "session-123",
      admin: {
        id: 5,
        username: "mod",
        role: "moderator",
        avatarUrl: "avatar.png",
      },
    });

    const result = await acceptAdminInvite({
      token: "invite-token",
      password: "super-secret-password",
    });

    expect(result).toEqual({
      ok: true,
      sessionId: "session-123",
      admin: {
        id: 5,
        username: "mod",
        role: "moderator",
        isOwner: false,
        avatarUrl: "avatar.png",
      },
    });
    expect(authMocks.hashPassword).toHaveBeenCalledWith("super-secret-password");
    expect(repoMocks.acceptInviteWithSession).toHaveBeenCalledWith({
      adminId: 5,
      passwordHash: "hashed-password",
    });
  });
});
