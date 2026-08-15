import { readJsonWithLimit } from "./http-body.js";
import { logger } from "./logger.js";

/** Largest geocoding response we read, in bytes. */
const MAX_GEOCODING_BYTES = 256 * 1024;

/** Time budget for a single geocoding request, in milliseconds. */
const GEOCODING_TIMEOUT_MS = 5000;

const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "lmaa.space/1.0 (shop directory)";
/**
 * A resolved pair of coordinates and where it came from.
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  /** Address the provider matched, kept for the audit trail. */
  displayName: string;
  /** Provider and granularity, for example `Photon (street-level)`. */
  source: string;
}

/**
 * The parts of an address the cascade works from.
 */
export interface AddressParts {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryCode?: string | null;
}

interface PhotonResponse {
  features?: {
    geometry?: { coordinates?: unknown };
    properties?: Record<string, unknown>;
  }[];
}

interface NominatimEntry {
  lat: string;
  lon: string;
  display_name: string;
}

function describePhotonFeature(properties: Record<string, unknown> | undefined): string {
  if (!properties) return "";
  return ["name", "street", "housenumber", "postcode", "city", "country"]
    .map((key) => properties[key])
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join(", ");
}

/**
 * Asks Photon for one match.
 *
 * @param query - Free-text address query.
 * @param granularity - Label describing how precise the query was.
 * @returns The first match, or `null` when Photon has none or fails.
 *
 * @remarks
 * Photon answers in GeoJSON, whose coordinates are ordered longitude first.
 * Reading them the other way round puts every German shop in Somalia, so the
 * order is handled here rather than left to each call site.
 */
async function queryPhoton(query: string, granularity: string): Promise<GeocodingResult | null> {
  const url = `${PHOTON_ENDPOINT}?${new URLSearchParams({ q: query, limit: "1" })}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(GEOCODING_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, query }, "photon geocoding returned an error status");
      return null;
    }

    const data = await readJsonWithLimit<PhotonResponse>(response, MAX_GEOCODING_BYTES);
    const feature = data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

    const [longitude, latitude] = coordinates;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;

    return {
      latitude,
      longitude,
      displayName: describePhotonFeature(feature?.properties) || query,
      source: `Photon (${granularity})`,
    };
  } catch (err) {
    logger.warn({ err, query }, "photon geocoding failed");
    return null;
  }
}

/**
 * Asks Nominatim for one match.
 *
 * @param query - Free-text address query.
 * @param countryCode - Optional ISO 3166-1 alpha-2 code narrowing the search.
 * @param granularity - Label describing how precise the query was.
 * @returns The first match, or `null` when Nominatim has none or fails.
 */
async function queryNominatim(
  query: string,
  countryCode: string | undefined,
  granularity: string,
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    addressdetails: "0",
  });
  if (countryCode) params.set("countrycodes", countryCode.toLowerCase());

  try {
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(GEOCODING_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, query },
        "nominatim geocoding returned an error status",
      );
      return null;
    }

    const data = await readJsonWithLimit<NominatimEntry[]>(response, MAX_GEOCODING_BYTES);
    const entry = Array.isArray(data) ? data[0] : undefined;
    if (!entry) return null;

    const latitude = Number.parseFloat(entry.lat);
    const longitude = Number.parseFloat(entry.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
      displayName: entry.display_name,
      source: `Nominatim (${granularity})`,
    };
  } catch (err) {
    logger.warn({ err, query }, "nominatim geocoding failed");
    return null;
  }
}

/**
 * Resolves a free-text place to coordinates.
 *
 * @param query - City name, postal code, or full address.
 * @param countryCode - Optional ISO 3166-1 alpha-2 code narrowing the search.
 * @returns Coordinates with their source, or `null` when nothing matched.
 *
 * @remarks
 * Photon answers first, because the canonical shop-check rules name it as the
 * primary tool. Nominatim is asked only when Photon has nothing, so there is
 * one order in which the two are consulted rather than one per call site.
 */
export async function geocode(
  query: string,
  countryCode?: string,
): Promise<GeocodingResult | null> {
  const scoped = countryCode ? `${query}, ${countryCode}` : query;
  return (await queryPhoton(scoped, "place")) ?? queryNominatim(query, countryCode, "place");
}

/**
 * Resolves a structured address through the fallback cascade.
 *
 * @param parts - Street, postal code, city and country of the address.
 * @returns Coordinates with their source, or `null` when every step failed.
 *
 * @remarks
 * The cascade is the one the canonical rules define: the full address first,
 * then the address without its street, then postal code and city alone. Each
 * step is coarser than the last, and the returned `source` says which one
 * answered, so a reviewer can tell a building apart from the centre of a town.
 *
 * The address is assembled here from named fields rather than accepted as a
 * finished string, which is what keeps the automated reviewer from choosing a
 * destination of its own.
 */
export async function geocodeAddress(parts: AddressParts): Promise<GeocodingResult | null> {
  const street = parts.street?.trim() ?? "";
  const postalCode = parts.postalCode?.trim() ?? "";
  const city = parts.city?.trim() ?? "";
  const countryCode = parts.countryCode?.trim().toUpperCase() ?? "";

  const steps: { query: string; granularity: string }[] = [];
  if (street && city) {
    steps.push({
      query: [street, postalCode, city, countryCode].filter(Boolean).join(", "),
      granularity: "street-level",
    });
  }
  if (postalCode && city) {
    steps.push({
      query: [postalCode, city, countryCode].filter(Boolean).join(", "),
      granularity: "PLZ+Ort",
    });
  }
  if (city) {
    steps.push({
      query: [city, countryCode].filter(Boolean).join(", "),
      granularity: "Ort",
    });
  }

  for (const step of steps) {
    const result = await queryPhoton(step.query, step.granularity);
    if (result) return result;
  }

  const last = steps.at(-1);
  return last ? queryNominatim(last.query, countryCode || undefined, last.granularity) : null;
}
