import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectUrlMocks = vi.hoisted(() => ({
  resolveManagedRedirectUrl: vi.fn(),
}));

vi.mock("../services/redirect-urls.js", () => redirectUrlMocks);
vi.mock("../middleware/rate-limit.js", () => ({
  rateLimit: vi.fn(() => (_c: unknown, next: () => Promise<void>) => next()),
}));

import { redirectUrlRoutes } from "../routes/redirect-urls.js";

describe("redirectUrlRoutes", () => {
  const app = new Hono();
  app.route("/internal", redirectUrlRoutes);

  beforeEach(() => vi.clearAllMocks());

  it("resolves a managed redirect URL", async () => {
    redirectUrlMocks.resolveManagedRedirectUrl.mockResolvedValue("https://youtu.be/dQw4w9WgXcQ");

    const res = await app.request("/internal/redirect-urls/amazon");

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(redirectUrlMocks.resolveManagedRedirectUrl).toHaveBeenCalledWith("amazon");
    expect(await res.json()).toEqual({ data: { targetUrl: "https://youtu.be/dQw4w9WgXcQ" } });
  });

  it("returns 404 for unknown managed redirects", async () => {
    redirectUrlMocks.resolveManagedRedirectUrl.mockResolvedValue(null);

    const res = await app.request("/internal/redirect-urls/missing");

    expect(res.status).toBe(404);
  });
});
