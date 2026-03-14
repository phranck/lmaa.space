import { logger } from "./logger.js";

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Resolves a city name or postal code to coordinates via the Nominatim API.
 *
 * @param query - City name or postal code (e.g. "Berlin" or "10115").
 * @param countryCode - Optional ISO country code to narrow results (e.g. "DE").
 * @returns Coordinates or `null` if nothing found.
 */
export async function geocode(
  query: string,
  countryCode?: string,
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    addressdetails: "0",
  });
  if (countryCode) {
    params.set("countrycodes", countryCode.toLowerCase());
  }

  const url = `https://nominatim.openstreetmap.org/search?${params}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "lmaa.space/1.0 (shop directory)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      logger.warn(`Nominatim returned ${res.status} for query "${query}"`);
      return null;
    }

    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (data.length === 0) return null;

    return {
      latitude: Number.parseFloat(data[0].lat),
      longitude: Number.parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (err) {
    logger.warn(`Nominatim geocoding failed for "${query}": ${err}`);
    return null;
  }
}
