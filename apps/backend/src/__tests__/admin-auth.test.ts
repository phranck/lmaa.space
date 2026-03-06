import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  createOwnerAdminWithSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  findAdminByUsername: vi.fn(),
  getAdminCount: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("../repositories/admin-auth.js", () => repoMocks);
vi.mock("../services/auth.js", () => authMocks);

import { setupOwnerAdmin } from "../services/admin-auth.js";

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
