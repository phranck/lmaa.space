import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { geocode, geocodeAddress } from "../lib/geocoding.js";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown, status = 200): Response {
  // A real Response is used rather than a hand-rolled object, because the
  // helper reads the body as a stream under a byte budget and a fake `json()`
  // would never be called.
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function photonHit(latitude: number, longitude: number, properties: Record<string, string> = {}) {
  return jsonResponse({
    features: [{ geometry: { coordinates: [longitude, latitude] }, properties }],
  });
}

function photonMiss() {
  return jsonResponse({ features: [] });
}

function nominatimHit(latitude: string, longitude: string, displayName: string) {
  return jsonResponse([{ lat: latitude, lon: longitude, display_name: displayName }]);
}

function nominatimMiss() {
  return jsonResponse([]);
}

function calledUrls(): string[] {
  return (fetch as FetchMock).mock.calls.map((call) => String(call[0]));
}

/** Reads a query back as text, where a space arrives as `+`. */
function decodeQuery(url: string): string {
  return decodeURIComponent(url.replace(/\+/g, " "));
}

describe("geocode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks Photon first, as the canonical rules require", async () => {
    (fetch as FetchMock).mockImplementation(() =>
      Promise.resolve(photonHit(52.52, 13.405, { name: "Berlin" })),
    );

    const result = await geocode("Berlin");

    expect(calledUrls()[0]).toContain("photon.komoot.io");
    expect(result?.latitude).toBeCloseTo(52.52);
    expect(result?.longitude).toBeCloseTo(13.405);
    expect(result?.source).toContain("Photon");
  });

  it("reads GeoJSON coordinates as longitude first", async () => {
    // Reading them the other way round puts a German shop in Somalia, which is
    // exactly the mistake this asserts against.
    (fetch as FetchMock).mockImplementation(() => Promise.resolve(photonHit(52.52, 13.405)));

    const result = await geocode("Berlin");

    expect(result?.latitude).toBeGreaterThan(50);
    expect(result?.longitude).toBeLessThan(20);
  });

  it("falls back to Nominatim only when Photon has nothing", async () => {
    (fetch as FetchMock)
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(nominatimHit("52.5200", "13.4050", "Berlin, Germany"));

    const result = await geocode("Berlin", "DE");

    const urls = calledUrls();
    expect(urls[0]).toContain("photon.komoot.io");
    expect(urls[1]).toContain("nominatim.openstreetmap.org");
    expect(urls[1]).toContain("countrycodes=de");
    expect(result?.source).toContain("Nominatim");
  });

  it("returns null when neither provider has a match", async () => {
    (fetch as FetchMock).mockResolvedValueOnce(photonMiss()).mockResolvedValueOnce(nominatimMiss());

    expect(await geocode("Nirgendwo 12345")).toBeNull();
  });

  it("returns null on a non-OK response from both providers", async () => {
    (fetch as FetchMock).mockImplementation(() => Promise.resolve(jsonResponse({}, 429)));

    expect(await geocode("Berlin")).toBeNull();
  });

  it("returns null on a network error", async () => {
    (fetch as FetchMock).mockRejectedValue(new Error("Network error"));

    expect(await geocode("Berlin")).toBeNull();
  });
});

describe("geocodeAddress", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("tries the full address first and reports street-level granularity", async () => {
    (fetch as FetchMock).mockImplementation(() => Promise.resolve(photonHit(53.07, 8.8)));

    const result = await geocodeAddress({
      street: "Musterweg 3",
      postalCode: "28195",
      city: "Bremen",
      countryCode: "de",
    });

    const url = decodeQuery(calledUrls()[0]);
    expect(url).toContain("Musterweg 3");
    expect(url).toContain("28195");
    expect(url).toContain("DE");
    expect(result?.source).toBe("Photon (street-level)");
  });

  it("drops the street on the second step", async () => {
    (fetch as FetchMock)
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(photonHit(53.07, 8.8));

    const result = await geocodeAddress({
      street: "Musterweg 3",
      postalCode: "28195",
      city: "Bremen",
      countryCode: "DE",
    });

    const second = decodeQuery(calledUrls()[1]);
    expect(second).not.toContain("Musterweg");
    expect(second).toContain("28195");
    expect(result?.source).toBe("Photon (PLZ+Ort)");
  });

  it("falls back to the town alone as the last step", async () => {
    (fetch as FetchMock)
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(photonHit(53.07, 8.8));

    const result = await geocodeAddress({
      street: "Musterweg 3",
      postalCode: "28195",
      city: "Bremen",
      countryCode: "DE",
    });

    expect(result?.source).toBe("Photon (Ort)");
  });

  it("asks Nominatim once every Photon step has failed", async () => {
    (fetch as FetchMock)
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(photonMiss())
      .mockResolvedValueOnce(nominatimHit("53.07", "8.80", "Bremen"));

    const result = await geocodeAddress({
      street: "Musterweg 3",
      postalCode: "28195",
      city: "Bremen",
      countryCode: "DE",
    });

    expect(calledUrls().at(-1)).toContain("nominatim.openstreetmap.org");
    expect(result?.source).toContain("Nominatim");
  });

  it("returns null when the whole cascade fails", async () => {
    (fetch as FetchMock).mockImplementation(() => Promise.resolve(photonMiss()));

    const result = await geocodeAddress({ city: "Nirgendwo", countryCode: "DE" });

    expect(result).toBeNull();
  });

  it("attempts nothing without a town", async () => {
    (fetch as FetchMock).mockImplementation(() => Promise.resolve(photonMiss()));

    const result = await geocodeAddress({ street: "Musterweg 3", countryCode: "DE" });

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
