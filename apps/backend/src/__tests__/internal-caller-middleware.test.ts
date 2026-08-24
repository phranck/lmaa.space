import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "a-token-long-enough-to-be-accepted-32";

const envMock = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    INTERNAL_API_TOKEN: undefined as string | undefined,
  },
}));

vi.mock("../config/env.js", () => envMock);

import { requireInternalCaller } from "../middleware/internal-caller.js";

/**
 * An app mounted the way production mounts it: the check on the mount, the
 * routes beneath it knowing nothing about it.
 */
function createApp() {
  const internal = new Hono();
  internal.use("*", requireInternalCaller);
  internal.get("/thing", (c) => c.json({ data: "served" }));

  const app = new Hono();
  app.route("/internal", internal);
  return app;
}

describe("requireInternalCaller", () => {
  beforeEach(() => {
    envMock.env.INTERNAL_API_TOKEN = TOKEN;
  });

  it("serves the renderer, which presents the token", async () => {
    const response = await createApp().request("/internal/thing", {
      headers: { "X-Internal-Token": TOKEN },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "served" });
  });

  it("refuses a caller presenting no token", async () => {
    const response = await createApp().request("/internal/thing");

    expect(response.status).toBe(404);
  });

  it("refuses a caller presenting the wrong token", async () => {
    const response = await createApp().request("/internal/thing", {
      headers: { "X-Internal-Token": "wrong-token-of-exactly-this-length!!" },
    });

    expect(response.status).toBe(404);
  });

  it("refuses a token that is only a prefix of the real one", async () => {
    const response = await createApp().request("/internal/thing", {
      headers: { "X-Internal-Token": TOKEN.slice(0, 10) },
    });

    expect(response.status).toBe(404);
  });

  it("refuses everybody when no token is configured, rather than letting all through", async () => {
    envMock.env.INTERNAL_API_TOKEN = undefined;

    const withHeader = await createApp().request("/internal/thing", {
      headers: { "X-Internal-Token": TOKEN },
    });
    const without = await createApp().request("/internal/thing");

    expect(withHeader.status).toBe(404);
    expect(without.status).toBe(404);
  });

  it("says nothing about the path existing", async () => {
    const refused = await createApp().request("/internal/thing");
    const missing = await createApp().request("/internal/nothing-here", {
      headers: { "X-Internal-Token": TOKEN },
    });

    expect(refused.status).toBe(missing.status);
  });
});
