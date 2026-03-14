import { TIMEOUT_GEOCODE_MS } from "../constants";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const PHOTON_BASE = "https://photon.komoot.io/api/";
const TIMEOUT_MS = TIMEOUT_GEOCODE_MS;

type NominatimResult = {
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

type GeoHit = {
  lat: number;
  lon: number;
  source: string;
  addressDetails: {
    state: string | null;
    countryCode: string | null;
    city: string | null;
    postalCode: string | null;
  };
};

export type GeoResult = {
  latitude: number | null;
  longitude: number | null;
  source: string;
  fallbackLevel: "structured" | "free_text" | "postal_city" | "city_only" | "none";
  resolvedState: string | null;
  resolvedCountryCode: string | null;
  resolvedCity: string | null;
};

/** Structured Nominatim query with addressdetails for maximum accuracy. */
async function queryNominatimStructured(
  params: { street?: string; city?: string; postalcode?: string; country?: string },
  userAgent: string,
): Promise<GeoHit | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(NOMINATIM_BASE);
    if (params.street) url.searchParams.set("street", params.street);
    if (params.city) url.searchParams.set("city", params.city);
    if (params.postalcode) url.searchParams.set("postalcode", params.postalcode);
    if (params.country) url.searchParams.set("country", params.country);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    return parseNominatimHit(data[0], "Nominatim");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Free-text Nominatim query with addressdetails as fallback. */
async function queryNominatimFreeText(query: string, userAgent: string): Promise<GeoHit | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    return parseNominatimHit(data[0], "Nominatim");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseNominatimHit(result: NominatimResult | undefined, source: string): GeoHit | null {
  if (!result?.lat || !result?.lon) return null;
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const addr = result.address;
  return {
    lat,
    lon,
    source,
    addressDetails: {
      state: addr?.state ?? null,
      countryCode: addr?.country_code?.toUpperCase() ?? null,
      city: addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality ?? null,
      postalCode: addr?.postcode ?? null,
    },
  };
}

async function queryPhoton(query: string, userAgent: string): Promise<GeoHit | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(PHOTON_BASE);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: { "user-agent": userAgent, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const props = feature?.properties;
    return {
      lat,
      lon,
      source: "Photon",
      addressDetails: {
        state: props?.state ?? null,
        countryCode: props?.countrycode?.toUpperCase() ?? null,
        city: props?.city ?? null,
        postalCode: props?.postcode ?? null,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Infer ISO country code from European postal code format. Heuristic fallback only. */
export function inferCountryFromPostalCode(postalCode: string): string | null {
  const trimmed = postalCode.trim();
  // UK: letter-digit patterns (e.g. "SW1A 1AA", "EC2R 8AH")
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(trimmed)) return "GB";
  // Netherlands: 4 digits + 2 letters (e.g. "1234 AB")
  if (/^\d{4}\s?[A-Z]{2}$/i.test(trimmed)) return "NL";
  // Portugal: 4 digits + dash + 3 digits (e.g. "1000-001")
  if (/^\d{4}-\d{3}$/.test(trimmed)) return "PT";
  // Poland: 2 digits + dash + 3 digits (e.g. "00-001")
  if (/^\d{2}-\d{3}$/.test(trimmed)) return "PL";
  // Sweden: 3 digits + space + 2 digits (e.g. "100 00")
  if (/^\d{3}\s\d{2}$/.test(trimmed)) return "SE";
  // Ireland: Eircode (e.g. "D02 AF30")
  if (/^[A-Z]\d[\dW]\s?[A-Z\d]{4}$/i.test(trimmed)) return "IE";
  // Greece: 3 digits + space + 2 digits (e.g. "104 31") — same as Sweden, ambiguous
  // Czech Republic: 3 digits + space + 2 digits (e.g. "110 00") — same pattern
  // These remain ambiguous with SE and need LLM/context for resolution.
  // Pure digit formats are too ambiguous between countries (4-digit: AT, CH, BE, DK, NO, HU, LU, SI; 5-digit: DE, FR, IT, ES, FI)
  return null;
}

/** German state from first two digits of postal code. */
function inferGermanState(postalCode: string): string | null {
  const prefix = Number.parseInt(postalCode.slice(0, 2), 10);
  if (Number.isNaN(prefix)) return null;
  if (prefix <= 6) return "Sachsen";
  if (prefix <= 9) return "Thüringen";
  if (prefix <= 12) return "Berlin";
  if (prefix <= 16) return "Brandenburg";
  if (prefix <= 19) return "Mecklenburg-Vorpommern";
  if (prefix <= 21) return "Hamburg";
  if (prefix <= 25) return "Schleswig-Holstein";
  if (prefix <= 27) return "Niedersachsen";
  if (prefix <= 28) return "Bremen";
  if (prefix <= 29) return "Niedersachsen";
  if (prefix <= 31) return "Niedersachsen";
  if (prefix <= 33) return "Nordrhein-Westfalen";
  if (prefix <= 36) return "Hessen";
  if (prefix <= 37) return "Niedersachsen";
  if (prefix <= 39) return "Sachsen-Anhalt";
  if (prefix <= 48) return "Nordrhein-Westfalen";
  if (prefix <= 49) return "Niedersachsen";
  if (prefix <= 53) return "Nordrhein-Westfalen";
  if (prefix <= 56) return "Rheinland-Pfalz";
  if (prefix <= 59) return "Nordrhein-Westfalen";
  if (prefix <= 65) return "Hessen";
  if (prefix <= 66) return "Saarland";
  if (prefix <= 69) return "Rheinland-Pfalz";
  if (prefix <= 79) return "Baden-Württemberg";
  if (prefix <= 87) return "Bayern";
  if (prefix <= 89) return "Baden-Württemberg";
  if (prefix <= 97) return "Bayern";
  if (prefix <= 99) return "Thüringen";
  return null;
}

export async function geocodeWithFallback({
  street,
  postalCode,
  city,
  countryCode,
  userAgent,
}: {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;
  userAgent: string;
}): Promise<GeoResult> {
  const noResult: GeoResult = {
    latitude: null,
    longitude: null,
    source: "no reliable hit",
    fallbackLevel: "none",
    resolvedState: null,
    resolvedCountryCode: null,
    resolvedCity: null,
  };

  // Infer country from postal code format if not provided
  const inferredCountry = countryCode ?? (postalCode ? inferCountryFromPostalCode(postalCode) : null);

  // Strategy 1: Structured Nominatim query (best accuracy)
  if (postalCode && city) {
    const hit = await queryNominatimStructured(
      {
        street: street ?? undefined,
        city,
        postalcode: postalCode,
        country: inferredCountry ?? undefined,
      },
      userAgent,
    );
    if (hit) {
      return buildResult(hit, street ? "structured" : "postal_city", postalCode, inferredCountry);
    }
  }

  // Strategy 2: Free-text query with full address components
  const freeTextParts = [street, postalCode, city, inferredCountry].filter(Boolean);
  if (freeTextParts.length >= 2) {
    const hit = await queryNominatimFreeText(freeTextParts.join(", "), userAgent);
    if (hit) {
      return buildResult(hit, "free_text", postalCode, inferredCountry);
    }
  }

  // Strategy 3: Photon with full address string
  if (freeTextParts.length >= 2) {
    const hit = await queryPhoton(freeTextParts.join(", "), userAgent);
    if (hit) {
      return buildResult(hit, "free_text", postalCode, inferredCountry);
    }
  }

  // Strategy 4: City-only as last resort
  if (city) {
    const cityQuery = inferredCountry ? `${city}, ${inferredCountry}` : city;
    const hit = await queryNominatimFreeText(cityQuery, userAgent);
    if (hit) {
      return buildResult(hit, "city_only", postalCode, inferredCountry);
    }
  }

  return noResult;
}

function buildResult(
  hit: GeoHit,
  fallbackLevel: GeoResult["fallbackLevel"],
  postalCode: string | null,
  inferredCountry: string | null,
): GeoResult {
  // Prefer address details from the geocoding provider, with fallback inference
  const resolvedCountryCode = hit.addressDetails.countryCode ?? inferredCountry ?? null;
  let resolvedState = hit.addressDetails.state;
  // For German addresses: infer state from PLZ if geocoding didn't provide it
  if (!resolvedState && resolvedCountryCode === "DE" && postalCode && /^\d{5}$/.test(postalCode)) {
    resolvedState = inferGermanState(postalCode);
  }

  return {
    latitude: hit.lat,
    longitude: hit.lon,
    source: `${hit.source} (${fallbackLevel})`,
    fallbackLevel,
    resolvedState: resolvedState ?? null,
    resolvedCountryCode: resolvedCountryCode ?? null,
    resolvedCity: hit.addressDetails.city ?? null,
  };
}
