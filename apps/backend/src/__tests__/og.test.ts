import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchExternalResource } from "../lib/og.js";

describe("fetchExternalResource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the final URL for a direct external response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalResource("https://example.com", {
      headers: { Accept: "text/html" },
    });

    expect(result?.finalUrl).toBe("https://example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("follows redirects to another external URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/image.png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("img", {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalResource("https://example.com/start", {
      headers: { Accept: "image/*" },
    });

    expect(result?.finalUrl).toBe("https://cdn.example.com/image.png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("blocks redirects to private targets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/internal" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalResource("https://example.com/start", {
      headers: { Accept: "text/html" },
    });

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
