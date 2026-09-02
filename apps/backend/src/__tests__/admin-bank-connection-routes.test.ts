import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("../middleware/auth.js", () => ({
  requireOwner: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  beginBankAuthorization: vi.fn(),
  completeBankAuthorization: vi.fn(),
  getBankConnectionStatus: vi.fn(),
}));

const clientMocks = vi.hoisted(() => ({
  isEnableBankingConfigured: vi.fn(() => true),
}));

vi.mock("../services/bank-connection.js", () => serviceMocks);
vi.mock("../services/enable-banking-client.js", () => clientMocks);

import { bankConnectionRoutes } from "../routes/admin/bank-connection.js";

/** A value of the shape and length the site issues. */
const ISSUED = "a".repeat(64);

/** The status as the service hands it back. */
const disconnected = {
  configured: true,
  connected: false,
  institutionName: "",
  institutionCountry: "",
  consentValidUntil: null,
  connectedAt: null,
};

function makeApp() {
  const app = new Hono();
  app.route("/", bankConnectionRoutes);
  return app;
}

function postSession(body: unknown) {
  return makeApp().request("/bank-connection/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("bank connection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMocks.isEnableBankingConfigured.mockReturnValue(true);
    serviceMocks.getBankConnectionStatus.mockResolvedValue(disconnected);
    serviceMocks.beginBankAuthorization.mockResolvedValue({ url: "https://bank.example" });
    serviceMocks.completeBankAuthorization.mockResolvedValue({ ...disconnected, connected: true });
  });

  it("answers the status from the site's own database", async () => {
    const response = await makeApp().request("/bank-connection");

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(disconnected);
  });

  it("hands out the address to send the browser to", async () => {
    const response = await makeApp().request("/bank-connection/authorize", { method: "POST" });

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ url: "https://bank.example" });
  });

  describe("without a credential", () => {
    beforeEach(() => {
      clientMocks.isEnableBankingConfigured.mockReturnValue(false);
    });

    it("refuses to start an authorization", async () => {
      const response = await makeApp().request("/bank-connection/authorize", { method: "POST" });

      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("bank_not_configured");
      expect(serviceMocks.beginBankAuthorization).not.toHaveBeenCalled();
    });

    it("refuses to spend a return", async () => {
      const response = await postSession({ code: "code-1", state: ISSUED });

      expect(response.status).toBe(503);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });

    it("still answers the status", async () => {
      const response = await makeApp().request("/bank-connection");

      expect(response.status).toBe(200);
    });
  });

  describe("the return from the bank", () => {
    it("is spent when both halves are there", async () => {
      const response = await postSession({ code: "code-1", state: ISSUED });

      expect(response.status).toBe(200);
      expect(serviceMocks.completeBankAuthorization).toHaveBeenCalledWith("code-1", ISSUED);
    });

    it("is refused without a state", async () => {
      const response = await postSession({ code: "code-1" });

      expect(response.status).toBe(400);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });

    it("is refused without a code", async () => {
      const response = await postSession({ state: ISSUED });

      expect(response.status).toBe(400);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });

    it("is refused when the state is not the length this site issues", async () => {
      const response = await postSession({ code: "code-1", state: "a".repeat(63) });

      expect(response.status).toBe(400);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });

    it("is refused when the state is not hexadecimal", async () => {
      const response = await postSession({ code: "code-1", state: "z".repeat(64) });

      expect(response.status).toBe(400);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });

    it("is refused when the code carries characters an authorization code cannot", async () => {
      const response = await postSession({ code: "<script>", state: ISSUED });

      expect(response.status).toBe(400);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });

    it("is refused when the body carries anything else", async () => {
      const response = await postSession({ code: "code-1", state: ISSUED, role: "owner" });

      expect(response.status).toBe(400);
      expect(serviceMocks.completeBankAuthorization).not.toHaveBeenCalled();
    });
  });
});
