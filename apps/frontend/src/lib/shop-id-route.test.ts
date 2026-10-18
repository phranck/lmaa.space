import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/lib/api", () => apiMocks);

import { GET } from "../pages/shop/id/[token]";

/** Builds the redirect response supplied by Astro's route context. */
function redirect(path: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: path } });
}

describe("namespaced shop ID route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permanently redirects an issued token to the canonical slug and retains context", async () => {
    apiMocks.apiGet.mockResolvedValue({ id: 564, slug: "ma-oldtimer" });

    const response = await GET({
      params: { token: "nrqimu18" },
      redirect,
      url: new URL("https://lmaa.space/shop/id/nrqimu18?from=search&q=oldtimer"),
    } as never);

    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("/shop/ma-oldtimer?from=search&q=oldtimer");
    expect(apiMocks.apiGet).toHaveBeenCalledWith("/shops/id/nrqimu18");
  });

  it("rejects malformed tokens before calling the API", async () => {
    const response = await GET({
      params: { token: "not-a-token" },
      redirect,
      url: new URL("https://lmaa.space/shop/id/not-a-token"),
    } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/404");
    expect(apiMocks.apiGet).not.toHaveBeenCalled();
  });
});
