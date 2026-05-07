import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MastodonPostTemplate, SocialMediaAccount, Submission } from "../db/schema.js";

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

function makeTemplate(overrides: Partial<MastodonPostTemplate> = {}): MastodonPostTemplate {
  return {
    id: 7,
    name: "Approval Post",
    bodyText: "New shop: {{shopName}} — {{shopUrl}}",
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

    vi.doMock("../repositories/mastodon-post-templates.js", () => ({
      getMastodonPostTemplateById: vi.fn(),
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
    template: MastodonPostTemplate,
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

    vi.doMock("../repositories/mastodon-post-templates.js", () => ({
      getMastodonPostTemplateById: vi.fn(),
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

const getMastodonPostTemplateById = vi.fn();
const listActiveMastodonAccounts = vi.fn();
const loggerMock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

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

  vi.doMock("../repositories/mastodon-post-templates.js", () => ({
    getMastodonPostTemplateById,
  }));

  vi.doMock("../repositories/social-media-accounts.js", () => ({
    listActiveMastodonAccounts,
  }));

  return import("../services/mastodon.js");
}

/** Wait for the fire-and-forget void IIFE inside sendMastodonApprovalPost to settle. */
async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("postToMastodon (via sendMastodonApprovalPost)", () => {
  beforeEach(() => {
    getMastodonPostTemplateById.mockReset();
    listActiveMastodonAccounts.mockReset();
    loggerMock.debug.mockReset();
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("happy path: posts to ${instanceUrl}/api/v1/statuses with Bearer token, visibility, Idempotency-Key", async () => {
    const account = makeAccount(1, { instanceUrl: "https://fosstodon.org", accessToken: "abc123" });
    const template = makeTemplate({ bodyText: "New: {{shopName}}" });
    const submission = makeSubmission({ shopName: "Good Karma" });

    getMastodonPostTemplateById.mockResolvedValue(template);
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

  it("HTTP 401 → throws (error logged)", async () => {
    const account = makeAccount(1);
    const template = makeTemplate({ bodyText: "Post: {{shopName}}" });
    const submission = makeSubmission();

    getMastodonPostTemplateById.mockResolvedValue(template);
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

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: account.id, templateId: template.id }),
      "failed to send mastodon approval post",
    );
  });

  it("HTTP 503 → throws with truncated response body (≤300 chars)", async () => {
    const account = makeAccount(2);
    const template = makeTemplate({ bodyText: "Hello {{shopName}}" });
    const submission = makeSubmission();

    getMastodonPostTemplateById.mockResolvedValue(template);
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

    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    const errArg = (loggerMock.error.mock.calls[0] as [{ err: Error }, string])[0];
    expect(errArg.err.message).toContain("503");
    // Body must be truncated to 300 chars
    const truncated = longBody.slice(0, 300);
    expect(errArg.err.message).toContain(truncated);
    expect(errArg.err.message).not.toContain("x".repeat(301));
  });
});

// ---------------------------------------------------------------------------
// sendMastodonApprovalPost — guard rails
// ---------------------------------------------------------------------------

describe("sendMastodonApprovalPost — guard rails", () => {
  beforeEach(() => {
    getMastodonPostTemplateById.mockReset();
    listActiveMastodonAccounts.mockReset();
    loggerMock.debug.mockReset();
    loggerMock.info.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.error.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no-template-found → logs warn, no fetch", async () => {
    getMastodonPostTemplateById.mockResolvedValue(null);

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
      "mastodon post template not found, skipping post",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no-active-accounts → logs warn, no fetch", async () => {
    getMastodonPostTemplateById.mockResolvedValue(makeTemplate());
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
    getMastodonPostTemplateById.mockResolvedValue(makeTemplate({ bodyText: "   " }));
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
      "mastodon post template rendered empty, skipping post",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("happy path with 2 accounts → 2 fetches, no errors logged", async () => {
    const template = makeTemplate({ bodyText: "Shop: {{shopName}}" });
    const account1 = makeAccount(1);
    const account2 = makeAccount(2);

    getMastodonPostTemplateById.mockResolvedValue(template);
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
    const template = makeTemplate({ bodyText: "Shop: {{shopName}}" });
    const account1 = makeAccount(10);
    const account2 = makeAccount(20);

    getMastodonPostTemplateById.mockResolvedValue(template);
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
    service.sendMastodonApprovalPost(template.id, {
      submission: makeSubmission(),
      newShopId: 10,
      adminNote: "",
      categoryNames: [],
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: account2.id,
        templateId: template.id,
        err: expect.any(Error),
      }),
      "failed to send mastodon approval post",
    );
  });
});
