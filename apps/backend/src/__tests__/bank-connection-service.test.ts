import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent", DASHBOARD_URL: "https://dashboard.example" },
}));

const clientMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  isEnableBankingConfigured: vi.fn(() => true),
  startAuthorization: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getLiveBankConnection: vi.fn(),
  insertAuthorizationState: vi.fn(),
  replaceBankConnection: vi.fn(),
  takeAuthorizationState: vi.fn(),
}));

vi.mock("../services/enable-banking-client.js", () => clientMocks);
vi.mock("../repositories/bank-connections.js", () => repositoryMocks);

import { HttpError } from "../lib/http.js";
import {
  beginBankAuthorization,
  completeBankAuthorization,
  getBankConnectionStatus,
} from "../services/bank-connection.js";

/** A value of the shape and length the site issues. */
const ISSUED = "a".repeat(64);

/** A connection as the database hands it back. */
const storedConnection = {
  id: "2f1d0a1e-6f3f-4c5b-9c7a-0d1e2f3a4b5c",
  sessionId: "session-that-never-leaves-the-backend",
  accountUid: "account-1",
  aspspName: "Erste Bank",
  aspspCountry: "AT",
  consentValidUntil: new Date("2027-03-02T00:00:00.000Z"),
  revokedAt: null,
  createdAt: new Date("2026-09-03T10:00:00.000Z"),
};

describe("the bank connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMocks.isEnableBankingConfigured.mockReturnValue(true);
    repositoryMocks.insertAuthorizationState.mockImplementation(
      async (state: string, authorizationId: string, expiresAt: Date) => ({
        state,
        authorizationId,
        expiresAt,
        createdAt: new Date(),
      }),
    );
  });

  describe("what the dashboard is shown", () => {
    it("says so plainly when nothing is connected", async () => {
      repositoryMocks.getLiveBankConnection.mockResolvedValue(null);

      expect(await getBankConnectionStatus()).toEqual({
        configured: true,
        connected: false,
        institutionName: "",
        institutionCountry: "",
        consentValidUntil: null,
        connectedAt: null,
      });
    });

    it("carries nothing that could reach the account", async () => {
      repositoryMocks.getLiveBankConnection.mockResolvedValue(storedConnection);

      const status = await getBankConnectionStatus();

      expect(status.connected).toBe(true);
      expect(JSON.stringify(status)).not.toContain(storedConnection.sessionId);
      expect(JSON.stringify(status)).not.toContain(storedConnection.accountUid);
    });
  });

  describe("starting an authorization", () => {
    it("writes the value down before handing out the address", async () => {
      clientMocks.startAuthorization.mockResolvedValue({
        url: "https://bank.example/authorize",
        authorizationId: "auth-1",
      });

      const started = await beginBankAuthorization();

      expect(started).toEqual({ url: "https://bank.example/authorize" });
      expect(repositoryMocks.insertAuthorizationState).toHaveBeenCalledTimes(1);

      // The value that was written down is the one that was sent out.
      const sentState = clientMocks.startAuthorization.mock.calls[0][0];
      const storedState = repositoryMocks.insertAuthorizationState.mock.calls[0][0];
      expect(storedState).toBe(sentState);
      expect(sentState).toMatch(/^[0-9a-f]{64}$/);
    });

    it("sends the bank back to the dashboard, whatever the request said", async () => {
      clientMocks.startAuthorization.mockResolvedValue({
        url: "https://bank.example",
        authorizationId: "",
      });

      await beginBankAuthorization();

      expect(clientMocks.startAuthorization.mock.calls[0][1]).toBe(
        "https://dashboard.example/bank-connection/callback",
      );
    });
  });

  describe("honouring a return", () => {
    it("refuses a value it never issued, without spending anything", async () => {
      repositoryMocks.takeAuthorizationState.mockResolvedValue(null);

      await expect(completeBankAuthorization("code-1", ISSUED)).rejects.toMatchObject({
        status: 400,
        code: "bank_state_unknown",
      });
      expect(clientMocks.createSession).not.toHaveBeenCalled();
      expect(repositoryMocks.replaceBankConnection).not.toHaveBeenCalled();
    });

    it("refuses a value that has already been spent", async () => {
      // Spending the value removes it, so the second return finds nothing. That
      // is the same answer as for a value the site never issued, which is what
      // the repository reports back as `null`.
      repositoryMocks.takeAuthorizationState
        .mockResolvedValueOnce({ state: ISSUED, authorizationId: "auth-1" })
        .mockResolvedValueOnce(null);
      clientMocks.createSession.mockResolvedValue({
        sessionId: storedConnection.sessionId,
        accountUids: ["account-1"],
        aspspName: "Erste Bank",
        aspspCountry: "AT",
        consentValidUntil: storedConnection.consentValidUntil,
      });
      repositoryMocks.replaceBankConnection.mockResolvedValue(storedConnection);

      await completeBankAuthorization("code-1", ISSUED);

      await expect(completeBankAuthorization("code-1", ISSUED)).rejects.toMatchObject({
        status: 400,
        code: "bank_state_unknown",
      });
      expect(clientMocks.createSession).toHaveBeenCalledTimes(1);
    });

    it("stores nothing when the session reaches more than the one account", async () => {
      repositoryMocks.takeAuthorizationState.mockResolvedValue({
        state: ISSUED,
        authorizationId: "auth-1",
      });
      clientMocks.createSession.mockResolvedValue({
        sessionId: "session-2",
        accountUids: ["account-1", "account-2"],
        aspspName: "Erste Bank",
        aspspCountry: "AT",
        consentValidUntil: null,
      });

      await expect(completeBankAuthorization("code-1", ISSUED)).rejects.toMatchObject({
        status: 502,
        code: "bank_unexpected_accounts",
      });
      expect(repositoryMocks.replaceBankConnection).not.toHaveBeenCalled();
    });

    it("stores nothing when the session reaches no account at all", async () => {
      repositoryMocks.takeAuthorizationState.mockResolvedValue({
        state: ISSUED,
        authorizationId: "auth-1",
      });
      clientMocks.createSession.mockResolvedValue({
        sessionId: "session-3",
        accountUids: [],
        aspspName: "",
        aspspCountry: "",
        consentValidUntil: null,
      });

      await expect(completeBankAuthorization("code-1", ISSUED)).rejects.toBeInstanceOf(HttpError);
      expect(repositoryMocks.replaceBankConnection).not.toHaveBeenCalled();
    });

    it("puts the connection in force and reports what the dashboard shows", async () => {
      repositoryMocks.takeAuthorizationState.mockResolvedValue({
        state: ISSUED,
        authorizationId: "auth-1",
      });
      clientMocks.createSession.mockResolvedValue({
        sessionId: storedConnection.sessionId,
        accountUids: ["account-1"],
        aspspName: "Erste Bank",
        aspspCountry: "AT",
        consentValidUntil: storedConnection.consentValidUntil,
      });
      repositoryMocks.replaceBankConnection.mockResolvedValue(storedConnection);

      const status = await completeBankAuthorization("code-1", ISSUED);

      expect(repositoryMocks.replaceBankConnection).toHaveBeenCalledWith(
        expect.objectContaining({ accountUid: "account-1", aspspName: "Erste Bank" }),
        expect.any(Date),
      );
      expect(status).toMatchObject({
        connected: true,
        institutionName: "Erste Bank",
        institutionCountry: "AT",
        consentValidUntil: storedConnection.consentValidUntil.toISOString(),
      });
    });
  });
});
