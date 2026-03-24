import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { geocode } from "../lib/geocoding.js";

describe("geocode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns coordinates for a successful response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: "52.5200", lon: "13.4050", display_name: "Berlin, Germany" },
      ],
    });

    const result = await geocode("Berlin");

    expect(result).toEqual({
      latitude: 52.52,
      longitude: 13.405,
      displayName: "Berlin, Germany",
    });
  });

  it("passes country code as query parameter", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await geocode("Berlin", "DE");

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("countrycodes=de");
  });

  it("returns null for empty results", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await geocode("Nonexistent Place 12345");

    expect(result).toBeNull();
  });

  it("returns null on non-OK response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
    });

    const result = await geocode("Berlin");

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const result = await geocode("Berlin");

    expect(result).toBeNull();
  });
});
