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
    shopCheckNotes: null,
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
    scopes: ["submission"],
    bodyMastodon: "New shop: {{shopName}} — {{shopUrl}}",
    bodyBluesky: null,
    isSystemTemplate: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeAccount(id: number, overrides: Partial<SocialMediaAccount> = {}): SocialMediaAccount {
  return {
    id,
    platform: "mastodon",
    label: `Account ${id}`,
    profileUrl: `https://mastodon.social/@user${id}`,
    canPost: true,
    showInFooter: true,
    instanceUrl: "https://mastodon.social",
    handle: null,
    username: `user${id}`,
    accessToken: `token-${id}`,
    visibility: "public",
    maxPostCharacters: 500,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// __test__ helpers (renderPlainTemplate, idempotencyKey)
// ---------------------------------------------------------------------------

async function loadMastodonService() {
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

  return import("../services/mastodon.js");
}

describe("renderPlainTemplate", () => {
  let renderPlainTemplate: (text: string, variables: Record<string, string>) => string;

  beforeEach(async () => {
    const mod = await loadMastodonService();
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
  let idempotencyKey: typeof import("../services/mastodon.js").__test__.idempotencyKey;

  beforeEach(async () => {
    const mod = await loadMastodonService();
    idempotencyKey = mod.__test__.idempotencyKey;
  });

  function submissionContext(
    submission: Submission,
  ): import("../services/post-context.js").PostContext {
    return { kind: "submission", submission, newShopId: 0, adminNote: "", categoryNames: [] };
  }

  it("is stable: same account/template/submission produces the same hash", () => {
    const account = makeAccount(1);
    const template = makeTemplate();
    const submission = makeSubmission();

    const key1 = idempotencyKey(account, template, submissionContext(submission));
    const key2 = idempotencyKey(account, template, submissionContext(submission));

    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64);
  });

  it("is unique: different submission id produces a different hash", () => {
    const account = makeAccount(1);
    const template = makeTemplate();
    const submission1 = makeSubmission({ id: 1 });
    const submission2 = makeSubmission({ id: 2 });

    expect(idempotencyKey(account, template, submissionContext(submission1))).not.toBe(
      idempotencyKey(account, template, submissionContext(submission2)),
    );
  });

  it("matches the expected sha256 of the canonical string", () => {
    const account = makeAccount(3);
    const template = makeTemplate({ id: 7 });
    const submission = makeSubmission({ id: 42 });

    expect(idempotencyKey(account, template, submissionContext(submission))).toBe(
      "9dd284992fa598ed356c4f8a55cab4af5f492da78bd32b3097f3ee26182a5d27",
    );
  });
});

// ---------------------------------------------------------------------------
// postToMastodonAccount
// ---------------------------------------------------------------------------

describe("postToMastodonAccount", () => {
  let postToMastodonAccount: typeof import("../services/mastodon.js").postToMastodonAccount;
  let resetRateLimitBuckets: () => void;
  const loggerWarn = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    loggerWarn.mockReset();

    vi.doMock("../config/env.js", () => ({
      env: {
        NODE_ENV: "test",
        FRONTEND_URL: "https://example.com",
        DASHBOARD_URL: "https://dashboard.example.com",
      },
    }));

    vi.doMock("../lib/logger.js", () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: loggerWarn, error: vi.fn() },
    }));

    const mod = await import("../services/mastodon.js");
    postToMastodonAccount = mod.postToMastodonAccount;
    resetRateLimitBuckets = mod.__test__.resetRateLimitBuckets;
    resetRateLimitBuckets();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("happy path: posts to ${instanceUrl}/api/v1/statuses with Bearer + visibility + Idempotency-Key", async () => {
    const account = makeAccount(1, { instanceUrl: "https://fosstodon.org", accessToken: "abc123" });
    const template = makeTemplate({ bodyMastodon: "New: {{shopName}}" });
    const submission = makeSubmission({ shopName: "Good Karma" });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await postToMastodonAccount(account, template, {
      kind: "submission",
      submission,
      newShopId: 99,
      adminNote: "",
      categoryNames: [],
    });

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

  it("HTTP 401 → throws with status in message", async () => {
    const account = makeAccount(1);
    const template = makeTemplate({ bodyMastodon: "Post: {{shopName}}" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("Unauthorized"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postToMastodonAccount(account, template, {
        kind: "submission",
        submission: makeSubmission(),
        newShopId: 5,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/401/);
  });

  it("HTTP 503 → throws with truncated response body (≤300 chars)", async () => {
    const account = makeAccount(2);
    const template = makeTemplate({ bodyMastodon: "Hello {{shopName}}" });

    const longBody = "x".repeat(500);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue(longBody),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postToMastodonAccount(account, template, {
        kind: "submission",
        submission: makeSubmission(),
        newShopId: 5,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/503.*xxx/);
  });

  it("rejects when account.platform is not mastodon", async () => {
    const account = makeAccount(1, { platform: "bluesky" });
    const template = makeTemplate();
    await expect(
      postToMastodonAccount(account, template, {
        kind: "submission",
        submission: makeSubmission(),
        newShopId: 1,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/not a mastodon/);
  });

  it("rejects when template missing bodyMastodon", async () => {
    const account = makeAccount(1);
    const template = makeTemplate({ bodyMastodon: null });
    await expect(
      postToMastodonAccount(account, template, {
        kind: "submission",
        submission: makeSubmission(),
        newShopId: 1,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/missing bodyMastodon/);
  });

  it("rejects when status length exceeds account.maxPostCharacters", async () => {
    const account = makeAccount(1, { maxPostCharacters: 10 });
    const template = makeTemplate({ bodyMastodon: "x".repeat(50) });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postToMastodonAccount(account, template, {
        kind: "submission",
        submission: makeSubmission(),
        newShopId: 1,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/maxPostCharacters/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("empty-rendered-status (all whitespace) → logs warn, no fetch", async () => {
    const account = makeAccount(1);
    const template = makeTemplate({ bodyMastodon: "   " });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await postToMastodonAccount(account, template, {
      kind: "submission",
      submission: makeSubmission(),
      newShopId: 1,
      adminNote: "",
      categoryNames: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 7 }),
      "mastodon body rendered empty, skipping",
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
    const mod = await loadMastodonService();
    consumeRateLimit = mod.__test__.consumeRateLimit;
    resetRateLimitBuckets = mod.__test__.resetRateLimitBuckets;
    resetRateLimitBuckets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("301st call in the same 5-minute window returns false (rate limit exceeded)", () => {
    const accountId = 42;
    for (let i = 0; i < 300; i++) {
      expect(consumeRateLimit(accountId)).toBe(true);
    }
    expect(consumeRateLimit(accountId)).toBe(false);
  });

  it("bucket resets after the 5-minute window expires", () => {
    const accountId = 99;
    const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

    for (let i = 0; i < 300; i++) {
      consumeRateLimit(accountId);
    }
    expect(consumeRateLimit(accountId)).toBe(false);

    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

    expect(consumeRateLimit(accountId)).toBe(true);
    for (let i = 1; i < 300; i++) {
      expect(consumeRateLimit(accountId)).toBe(true);
    }
    expect(consumeRateLimit(accountId)).toBe(false);
  });
});
