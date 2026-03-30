import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake timers drive cache expiry (CACHE_TTL_MS = 15 min).
// Each test advances system time by 20 min so previous cache entries are expired.
vi.useFakeTimers();

// All mock state is hoisted so it's available before module imports.
const { MockZeropsApiRequestError, clientMocks } = vi.hoisted(() => {
  class MockZeropsApiRequestError extends Error {
    httpStatus: number;
    errorCode: string;
    constructor(httpStatus: number, errorCode: string, message: string) {
      super(message);
      this.name = "ZeropsApiRequestError";
      this.httpStatus = httpStatus;
      this.errorCode = errorCode;
    }
  }
  const clientMocks = {
    fetchCostSummary: vi.fn(),
    fetchCostTimeline: vi.fn(),
    fetchBillingStatus: vi.fn(),
  };
  return { MockZeropsApiRequestError, clientMocks };
});

const envMock = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test" as const,
    LOG_LEVEL: "silent" as const,
    BILLING_API_TOKEN: "test-token" as string | undefined,
    BILLING_CLIENT_ID: "test-client-id" as string | undefined,
    BILLING_PROJECT_ID: undefined as string | undefined,
  },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock("../config/env.js", () => envMock);

vi.mock("../services/network-clients/zerops-client.js", () => ({
  // Regular function (not arrow) so it can be used as a constructor with `new`.
  // Returning an explicit object from a constructor replaces `this`.
  ZeropsClient: vi.fn(function MockZeropsClient() {
    return clientMocks;
  }),
  ZeropsApiRequestError: MockZeropsApiRequestError,
}));

import { billingRoutes } from "../routes/admin/billing.js";

const app = new Hono();
app.route("/", billingRoutes);

const COST_DATA = {
  today: 0.05,
  thisMonth: 1.2,
  lastMonth: 3.4,
  last30days: 2.1,
  averageLast30Days: 0.07,
  services: [],
};

const TIMELINE_DATA = {
  items: [
    { date: "2026-03-28", cost: 0.04 },
    { date: "2026-03-29", cost: 0.06 },
  ],
};

const STATUS_DATA = { credit: 10.0, promoCredit: 5.0 };

let systemTime = Date.now();

beforeEach(() => {
  // Advance past the 15-min TTL so previous cached entries are always expired.
  systemTime += 20 * 60 * 1000;
  vi.setSystemTime(systemTime);

  envMock.env.BILLING_API_TOKEN = "test-token";
  envMock.env.BILLING_CLIENT_ID = "test-client-id";
  envMock.env.BILLING_PROJECT_ID = undefined;

  Object.values(clientMocks).forEach((m) => m.mockReset());
});

afterEach(() => {
  vi.clearAllTimers();
});

// ---------------------------------------------------------------------------
// GET /billing/costs
// ---------------------------------------------------------------------------
describe("GET /billing/costs", () => {
  it("returns 503 when BILLING_API_TOKEN is not set", async () => {
    envMock.env.BILLING_API_TOKEN = undefined;

    const res = await app.request("/billing/costs");

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_not_configured");
  });

  it("returns 503 when BILLING_CLIENT_ID is not set", async () => {
    envMock.env.BILLING_CLIENT_ID = undefined;

    const res = await app.request("/billing/costs");

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_client_id_missing");
  });

  it("returns 200 with cost data on success", async () => {
    clientMocks.fetchCostSummary.mockResolvedValue(COST_DATA);

    const res = await app.request("/billing/costs");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: COST_DATA });
    expect(clientMocks.fetchCostSummary).toHaveBeenCalledTimes(1);
  });

  it("caches successful responses", async () => {
    clientMocks.fetchCostSummary.mockResolvedValue(COST_DATA);

    await app.request("/billing/costs");
    const res = await app.request("/billing/costs");

    expect(res.status).toBe(200);
    expect(clientMocks.fetchCostSummary).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when Zerops API responds with 401", async () => {
    clientMocks.fetchCostSummary.mockRejectedValue(
      new MockZeropsApiRequestError(401, "zerops_unauthorized", "Unauthorized"),
    );

    const res = await app.request("/billing/costs");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_unauthorized");
  });

  it("returns 502 when Zerops API responds with 5xx", async () => {
    clientMocks.fetchCostSummary.mockRejectedValue(
      new MockZeropsApiRequestError(503, "zerops_service_unavailable", "Service unavailable"),
    );

    const res = await app.request("/billing/costs");

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_service_unavailable");
  });

  it("returns 504 on request timeout", async () => {
    const timeoutError = Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" });
    clientMocks.fetchCostSummary.mockRejectedValue(timeoutError);

    const res = await app.request("/billing/costs");

    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_timeout");
  });
});

// ---------------------------------------------------------------------------
// GET /billing/timeline
// ---------------------------------------------------------------------------
describe("GET /billing/timeline", () => {
  it("returns 503 when BILLING_API_TOKEN is not set", async () => {
    envMock.env.BILLING_API_TOKEN = undefined;

    const res = await app.request("/billing/timeline");

    expect(res.status).toBe(503);
  });

  it("returns 200 with timeline data on success", async () => {
    clientMocks.fetchCostTimeline.mockResolvedValue(TIMELINE_DATA);

    const res = await app.request("/billing/timeline?days=7");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: TIMELINE_DATA });
    expect(clientMocks.fetchCostTimeline).toHaveBeenCalledWith(7);
  });

  it("defaults days to 30 when not provided", async () => {
    clientMocks.fetchCostTimeline.mockResolvedValue(TIMELINE_DATA);

    await app.request("/billing/timeline");

    expect(clientMocks.fetchCostTimeline).toHaveBeenCalledWith(30);
  });

  it("clamps days to 90 maximum", async () => {
    clientMocks.fetchCostTimeline.mockResolvedValue(TIMELINE_DATA);

    await app.request("/billing/timeline?days=200");

    expect(clientMocks.fetchCostTimeline).toHaveBeenCalledWith(90);
  });

  it("returns 502 when Zerops API returns an error", async () => {
    clientMocks.fetchCostTimeline.mockRejectedValue(
      new MockZeropsApiRequestError(500, "zerops_internal", "Internal error"),
    );

    const res = await app.request("/billing/timeline?days=5");

    expect(res.status).toBe(502);
  });

  it("caches per distinct days value", async () => {
    clientMocks.fetchCostTimeline.mockResolvedValue(TIMELINE_DATA);

    // Two requests with the same days value → one client call.
    await app.request("/billing/timeline?days=14");
    await app.request("/billing/timeline?days=14");

    expect(clientMocks.fetchCostTimeline).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// GET /billing/status
// ---------------------------------------------------------------------------
describe("GET /billing/status", () => {
  it("returns 503 when BILLING_API_TOKEN is not set", async () => {
    envMock.env.BILLING_API_TOKEN = undefined;

    const res = await app.request("/billing/status");

    expect(res.status).toBe(503);
  });

  it("returns 422 when client returns null (no BILLING_CLIENT_ID configured on client)", async () => {
    clientMocks.fetchBillingStatus.mockResolvedValue(null);

    const res = await app.request("/billing/status");

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_client_id_missing");
  });

  it("returns 200 with status data on success", async () => {
    clientMocks.fetchBillingStatus.mockResolvedValue(STATUS_DATA);

    const res = await app.request("/billing/status");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: STATUS_DATA });
  });

  it("returns 401 when Zerops API responds with 401", async () => {
    clientMocks.fetchBillingStatus.mockRejectedValue(
      new MockZeropsApiRequestError(401, "zerops_auth_failed", "Auth failed"),
    );

    const res = await app.request("/billing/status");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("zerops_auth_failed");
  });

  it("returns 504 on request timeout", async () => {
    const timeoutError = Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" });
    clientMocks.fetchBillingStatus.mockRejectedValue(timeoutError);

    const res = await app.request("/billing/status");

    expect(res.status).toBe(504);
  });
});
