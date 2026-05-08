import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SocialMediaAccount, SocialMediaPostTemplate, Submission } from "../db/schema.js";

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 1,
    shopName: "Karma Coffee",
    shopUrl: "https://karmacoffee.example",
    region: ["Berlin"],
    pickup: "yes",
    shipping: "DE",
    description: "Great coffee",
    ogImage: null,
    socialMedia: {},
    contactEmail: null,
    submitterEmail: null,
    submitterNote: null,
    status: "approved",
    adminNote: null,
    rejectionLongText: null,
    rejectionToken: null,
    feedbackSent: false,
    readyForReview: false,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<SocialMediaPostTemplate> = {}): SocialMediaPostTemplate {
  return {
    id: 7,
    name: "Approval Post",
    platforms: ["mastodon"],
    bodyMastodon: "New shop: {{shopName}} — {{shopUrl}}",
    bodyBluesky: null,
    isSystemTemplate: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeAccount(
  id: number,
  overrides: Partial<SocialMediaAccount> = {},
): SocialMediaAccount {
  return {
    id,
    platform: "mastodon",
    label: `Account ${id}`,
    instanceUrl: "https://mastodon.social",
    username: `user${id}`,
    accessToken: `token-${id}`,
    visibility: "public",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// __test__ helpers (renderPlainTemplate, idempotencyKey)
// ---------------------------------------------------------------------------

describe("renderPlainTemplate", () => {
  // Import the module statically for the helper tests — no repo mocks needed.
  let renderPlainTemplate: (text: string, variables: Record<string, string>) => string;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("../config/env.js", () => ({
      env: {
        NODE_ENV: "test",
        FRONTEND_URL: "https://example.com",
        DASHBOARD_URL: "https://dashboard.example.com",
      },
    }));

    vi.doMock("../lib/logger.js", () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    vi.doMock("../repositories/social-media-post-templates.js", () => ({
      getSocialMediaPostTemplateById: vi.fn(),
    }));

    vi.doMock("../repositories/social-media-accounts.js", () => ({
      listActiveMastodonAccounts: vi.fn(),
    }));

    const mod = await import("../services/mastodon.js");
    renderPlainTemplate = mod.__test__.renderPlainTemplate;
  });

  it("substitutes {{name}} placeholders with supplied values", () => {
    const result = renderPlainTemplate("Hello {{shopName}} at {{shopUrl}}", {
      shopName: "Karma Coffee",
      shopUrl: "https://karmacoffee.example",
    });
    expect(result).toBe("Hello Karma Coffee at https://karmacoffee.example");
  });

  it("renders missing keys as empty string", () => {
    const result = renderPlainTemplate("Name: {{shopName}}, Cat: {{missing}}", {
      shopName: "Karma Coffee",
    });
    expect(result).toBe("Name: Karma Coffee, Cat: ");
  });
});

// ---------------------------------------------------------------------------
// idempotencyKey
// ---------------------------------------------------------------------------

describe("idempotencyKey", () => {
  let idempotencyKey: (
    account: SocialMediaAccount,
    template: SocialMediaPostTemplate,
    submission: Submission,
  ) => string;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock("../config/env.js", () => ({
      env: {
        NODE_ENV: "test",
        FRONTEND_URL: "https://example.com",
        DASHBOARD_URL: "https://dashboard.example.com",
      },
    }));

    vi.doMock("../lib/logger.js", () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    vi.doMock("../repositories/social-media-post-templates.js", () => ({
      getSocialMediaPostTemplateById: vi.fn(),
    }));

    vi.doMock("../repositories/social-media-accounts.js", () => ({
      listActiveMastodonAccounts: vi.fn(),
    }));

    const mod = await import("../services/mastodon.js");
    idempotencyKey = mod.__test__.idempotencyKey;
  });

  it("is stable: same account/template/submission produces the same hash", () => {
    const account = makeAccount(1);
    const template = makeTemplate();
    const submission = makeSubmission();

    const key1 = idempotencyKey(account, template, submission);
    const key2 = idempotencyKey(account, template, submission);

    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64); // sha256 hex
  });

  it("is unique: different submission id produces a different hash", () => {
    const account = makeAccount(1);
    const template = makeTemplate();
    const submission1 = makeSubmission({ id: 1 });
    const submission2 = makeSubmission({ id: 2 });

    const key1 = idempotencyKey(account, template, submission1);
    const key2 = idempotencyKey(account, template, submission2);

    expect(key1).not.toBe(key2);
  });

  it("matches the expected sha256 of the canonical string", () => {
    const account = makeAccount(3);
    const template = makeTemplate({ id: 7 });
    const submission = makeSubmission({ id: 42 });

    expect(idempotencyKey(account, template, submission)).toBe(
      "9dd284992fa598ed356c4f8a55cab4af5f492da78bd32b3097f3ee26182a5d27",
    );
  });
});

// ---------------------------------------------------------------------------
// postToMastodon (via sendMastodonApprovalPost, fetch-stubbed)
// ---------------------------------------------------------------------------

const getSocialMediaPostTemplateById = vi.fn();
const listActiveMastodonAccounts = vi.fn();
const loggerMock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const recordBackgroundErrorMock = vi.fn();

async function loadMastodonService() {
  vi.resetModules();

  vi.doMock("../config/env.js", () => ({
    env: {
      NODE_ENV: "test",
      FRONTEND_URL: "https://example.com",
      DASHBOARD_URL: "https://dashboard.example.com",
    },
  }));

  vi.doMock("../lib/logger.js", () => ({ logger: loggerMock }));

  vi.doMock("../repositories/social-media-post-templates.js", () => ({
    getSocialMediaPostTemplateById,
  }));

  vi.doMock("../repositories/social-media-accounts.js", () => ({
    listActiveMastodonAccounts,
  }));

  vi.doMock("../services/background-errors.js", () => ({
    recordBackgroundError: recordBackgroundErrorMock,
  }));

  return import("../services/mastodon.js");
}

/** Wait for the fire-and-forget void IIFE inside sendMastodonApprovalPost to settle. */
async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("postToMastodon (via sendMastodonApprovalPost)", () => {
  beforeEach(() => {
    getSocialMediaPostTemplateById.mockReset();
    listActiveMastodonAccounts.mockReset();
    loggerMock.debug.mockReset();
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
    recordBackgroundErrorMock.mockReset();
    recordBackgroundErrorMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("happy path: posts to ${instanceUrl}/api/v1/statuses with Bearer token, visibility, Idempotency-Key", async () => {
    const account = makeAccount(1, { instanceUrl: "https://fosstodon.org", accessToken: "abc123" });
    const template = makeTemplate({ bodyMastodon: "New: {{shopName}}" });
    const submission = makeSubmission({ shopName: "Good Karma" });

    getSocialMediaPostTemplateById.mockResolvedValue(template);
    listActiveMastodonAccounts.mockResolvedValue([account]);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(template.id, {
      submission,
      newShopId: 99,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("https://fosstodon.org/api/v1/statuses");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer abc123");
    expect(headers["Idempotency-Key"]).toBeDefined();
    expect(headers["Idempotency-Key"]).toHaveLength(64);

    const body = init.body as URLSearchParams;
    expect(body.get("status")).toBe("New: Good Karma");
    expect(body.get("visibility")).toBe("public");
  });

  it("HTTP 401 → throws (background error recorded)", async () => {
    const account = makeAccount(1);
    const template = makeTemplate({ bodyMastodon: "Post: {{shopName}}" });
    const submission = makeSubmission();

    getSocialMediaPostTemplateById.mockResolvedValue(template);
    listActiveMastodonAccounts.mockResolvedValue([account]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("Unauthorized"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(template.id, {
      submission,
      newShopId: 5,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(recordBackgroundErrorMock).toHaveBeenCalledWith(
      "mastodon-post",
      expect.any(Error),
      expect.objectContaining({ accountId: account.id, templateId: template.id }),
    );
  });

  it("HTTP 503 → throws with truncated response body (≤300 chars) and records background error", async () => {
    const account = makeAccount(2);
    const template = makeTemplate({ bodyMastodon: "Hello {{shopName}}" });
    const submission = makeSubmission();

    getSocialMediaPostTemplateById.mockResolvedValue(template);
    listActiveMastodonAccounts.mockResolvedValue([account]);

    const longBody = "x".repeat(500);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue(longBody),
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(template.id, {
      submission,
      newShopId: 5,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(recordBackgroundErrorMock).toHaveBeenCalledTimes(1);
    const [, errArg] = recordBackgroundErrorMock.mock.calls[0] as [string, Error];
    expect(errArg.message).toContain("503");
    // Body must be truncated to 300 chars
    const truncated = longBody.slice(0, 300);
    expect(errArg.message).toContain(truncated);
    expect(errArg.message).not.toContain("x".repeat(301));
  });
});

// ---------------------------------------------------------------------------
// sendMastodonApprovalPost — guard rails
// ---------------------------------------------------------------------------

describe("sendMastodonApprovalPost — guard rails", () => {
  beforeEach(() => {
    getSocialMediaPostTemplateById.mockReset();
    listActiveMastodonAccounts.mockReset();
    loggerMock.debug.mockReset();
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
    recordBackgroundErrorMock.mockReset();
    recordBackgroundErrorMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no-template-found → logs warn, no fetch", async () => {
    getSocialMediaPostTemplateById.mockResolvedValue(null);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(99, {
      submission: makeSubmission(),
      newShopId: 1,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 99 }),
      "social-media post template not found, skipping post",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("template missing mastodon body → logs warn, no fetch", async () => {
    getSocialMediaPostTemplateById.mockResolvedValue(makeTemplate({ bodyMastodon: null }));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(7, {
      submission: makeSubmission(),
      newShopId: 1,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 7 }),
      "social-media post template missing mastodon body, skipping post",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-active-accounts → logs warn, no fetch", async () => {
    getSocialMediaPostTemplateById.mockResolvedValue(makeTemplate());
    listActiveMastodonAccounts.mockResolvedValue([]);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(7, {
      submission: makeSubmission(),
      newShopId: 1,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 7 }),
      "no active mastodon accounts configured, skipping post",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("empty-rendered-status (all whitespace) → logs warn, no fetch", async () => {
    getSocialMediaPostTemplateById.mockResolvedValue(makeTemplate({ bodyMastodon: "   " }));
    listActiveMastodonAccounts.mockResolvedValue([makeAccount(1)]);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(7, {
      submission: makeSubmission(),
      newShopId: 1,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 7 }),
      "social-media post template rendered empty, skipping post",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("happy path with 2 accounts → 2 fetches, no errors logged", async () => {
    const template = makeTemplate({ bodyMastodon: "Shop: {{shopName}}" });
    const account1 = makeAccount(1);
    const account2 = makeAccount(2);

    getSocialMediaPostTemplateById.mockResolvedValue(template);
    listActiveMastodonAccounts.mockResolvedValue([account1, account2]);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    service.sendMastodonApprovalPost(template.id, {
      submission: makeSubmission(),
      newShopId: 10,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it("partial failure (1 of 2 accounts rejected) → 2 fetches, error logged with accountId + templateId", async () => {
    const template = makeTemplate({ bodyMastodon: "Shop: {{shopName}}" });
    const account1 = makeAccount(10);
    const account2 = makeAccount(20);

    getSocialMediaPostTemplateById.mockResolvedValue(template);
    listActiveMastodonAccounts.mockResolvedValue([account1, account2]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: vi.fn().mockResolvedValue("Unprocessable entity"),
      });
    vi.stubGlobal("fetch", fetchMock);

    const service = await loadMastodonService();
    const submission = makeSubmission();
    service.sendMastodonApprovalPost(template.id, {
      submission,
      newShopId: 10,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(recordBackgroundErrorMock).toHaveBeenCalledTimes(1);
    expect(recordBackgroundErrorMock).toHaveBeenCalledWith(
      "mastodon-post",
      expect.any(Error),
      expect.objectContaining({
        accountId: account2.id,
        templateId: template.id,
        submissionId: submission.id,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// consumeRateLimit (via __test__ escape hatch)
// ---------------------------------------------------------------------------

describe("consumeRateLimit", () => {
  let consumeRateLimit: (accountId: number) => boolean;
  let resetRateLimitBuckets: () => void;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    vi.doMock("../config/env.js", () => ({
      env: {
        NODE_ENV: "test",
        FRONTEND_URL: "https://example.com",
        DASHBOARD_URL: "https://dashboard.example.com",
      },
    }));

    vi.doMock("../lib/logger.js", () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    vi.doMock("../repositories/social-media-post-templates.js", () => ({
      getSocialMediaPostTemplateById: vi.fn(),
    }));

    vi.doMock("../repositories/social-media-accounts.js", () => ({
      listActiveMastodonAccounts: vi.fn(),
    }));

    const mod = await import("../services/mastodon.js");
    consumeRateLimit = mod.__test__.consumeRateLimit;
    resetRateLimitBuckets = mod.__test__.resetRateLimitBuckets;

    // Start each test with a clean bucket state
    resetRateLimitBuckets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("301st call in the same 5-minute window returns false (rate limit exceeded)", () => {
    const accountId = 42;

    // First 300 calls must succeed
    for (let i = 0; i < 300; i++) {
      expect(consumeRateLimit(accountId)).toBe(true);
    }

    // 301st call must be rejected
    expect(consumeRateLimit(accountId)).toBe(false);
  });

  it("bucket resets after the 5-minute window expires", () => {
    const accountId = 99;
    const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

    // Exhaust the bucket
    for (let i = 0; i < 300; i++) {
      consumeRateLimit(accountId);
    }
    expect(consumeRateLimit(accountId)).toBe(false);

    // Advance time past the window — bucket should reset on next access
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

    // First call after window expiry starts a fresh bucket → allowed
    expect(consumeRateLimit(accountId)).toBe(true);
    // And the 300th call in the new window is still allowed
    for (let i = 1; i < 300; i++) {
      expect(consumeRateLimit(accountId)).toBe(true);
    }
    // 301st in new window is blocked again
    expect(consumeRateLimit(accountId)).toBe(false);
  });
});
