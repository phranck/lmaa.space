import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    TRUST_PROXY_IP_HEADER: "x-forwarded-for" as const,
    TRUST_PROXY_HOPS: 1,
    INTERNAL_API_TOKEN: undefined as string | undefined,
  },
}));

vi.mock("../config/env.js", () => envMock);

import { rateLimit } from "../middleware/rate-limit.js";

interface StoredEntry {
  count: number;
  resetAt: number;
}

/** Process-local store so each test starts from an empty set of buckets. */
function createStore() {
  const entries = new Map<string, StoredEntry>();
  return {
    get: (key: string) => entries.get(key),
    set: (key: string, entry: StoredEntry) => {
      entries.set(key, entry);
    },
    delete: (key: string) => {
      entries.delete(key);
    },
    keys: () => [...entries.keys()],
  };
}

/**
 * Builds an app that mirrors production mounting: a sub-router carrying the
 * routes, mounted under a prefix. The key has to survive that, because every
 * real route sits behind `/api/v1`.
 */
function buildApp(store: ReturnType<typeof createStore>, max: number) {
  const limit = rateLimit({ max, windowMs: 60_000, store });
  const api = new Hono();
  api.get("/items/:id", limit, (c) => c.json({ ok: true }));
  api.get("/other/:id", limit, (c) => c.json({ ok: true }));
  const app = new Hono();
  app.route("/api/v1", api);
  return app;
}

function get(app: Hono, path: string, headers: Record<string, string> = {}) {
  return app.request(path, { headers: { "X-Forwarded-For": "203.0.113.7", ...headers } });
}

describe("rateLimit key", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    envMock.env.INTERNAL_API_TOKEN = undefined;
  });

  it("refuses a caller that varies the identifier, not just one that repeats it", async () => {
    const app = buildApp(store, 2);

    expect((await get(app, "/api/v1/items/first")).status).toBe(200);
    expect((await get(app, "/api/v1/items/second")).status).toBe(200);
    // Varying the identifier is what enumeration and brute forcing do, so this
    // is the case the limit exists for.
    expect((await get(app, "/api/v1/items/third")).status).toBe(429);
  });

  it("still refuses a caller that repeats one identifier", async () => {
    const app = buildApp(store, 2);

    expect((await get(app, "/api/v1/items/same")).status).toBe(200);
    expect((await get(app, "/api/v1/items/same")).status).toBe(200);
    expect((await get(app, "/api/v1/items/same")).status).toBe(429);
  });

  it("gives each route its own bucket", async () => {
    const app = buildApp(store, 1);

    expect((await get(app, "/api/v1/items/x")).status).toBe(200);
    expect((await get(app, "/api/v1/items/y")).status).toBe(429);
    // A different route is a different bucket, so exhausting one must not
    // refuse the other.
    expect((await get(app, "/api/v1/other/x")).status).toBe(200);
  });

  it("gives each client its own bucket", async () => {
    const app = buildApp(store, 1);

    expect((await get(app, "/api/v1/items/x")).status).toBe(200);
    expect((await get(app, "/api/v1/items/y")).status).toBe(429);
    expect(
      (await get(app, "/api/v1/items/z", { "X-Forwarded-For": "198.51.100.5" })).status,
    ).toBe(200);
  });

  it("keys on the mounted route pattern rather than the resolved path", async () => {
    const app = buildApp(store, 5);

    await get(app, "/api/v1/items/first");
    await get(app, "/api/v1/items/second");

    expect(store.keys()).toEqual(["/api/v1/items/:id:203.0.113.7"]);
  });
});

describe("rateLimit internal caller exemption", () => {
  let store: ReturnType<typeof createStore>;
  const token = "internal-token-that-is-long-enough-32";

  beforeEach(() => {
    store = createStore();
    envMock.env.INTERNAL_API_TOKEN = token;
  });

  it("does not limit a caller presenting the internal token", async () => {
    const app = buildApp(store, 1);

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await get(app, `/api/v1/items/${attempt}`, { "X-Internal-Token": token });
      expect(res.status).toBe(200);
    }
    expect(store.keys()).toEqual([]);
  });

  it("limits a caller presenting a wrong token", async () => {
    const app = buildApp(store, 1);

    expect((await get(app, "/api/v1/items/x", { "X-Internal-Token": "wrong" })).status).toBe(200);
    expect((await get(app, "/api/v1/items/y", { "X-Internal-Token": "wrong" })).status).toBe(429);
  });

  it("grants no exemption while no internal token is configured", async () => {
    envMock.env.INTERNAL_API_TOKEN = undefined;
    const app = buildApp(store, 1);

    // A missing secret must remove the exemption rather than hand it out.
    expect((await get(app, "/api/v1/items/x", { "X-Internal-Token": token })).status).toBe(200);
    expect((await get(app, "/api/v1/items/y", { "X-Internal-Token": token })).status).toBe(429);
  });
});
