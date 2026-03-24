import type { HeadquartersInput } from "../repositories/headquarters.js";

const REGION_CODES = ["DE", "AT", "CH", "EU", "WORLD"] as const;

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => getString(entry))
    .filter((entry): entry is string => entry !== null);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export interface MappedShopData {
  name: string;
  url: string;
  description: string;
  region: string[];
  categoryIds: number[];
  contactEmail?: string;
  headquarters?: HeadquartersInput;
  socialMedia: Record<string, string>;
}

/**
 * Maps a raw ShopJson object (from shopcheck results) to a normalized shop data payload.
 *
 * @param shopJson - Raw shopcheck output object.
 * @param categoryNameToId - Lookup map from lower-cased category name to id.
 * @returns Mapped shop payload ready for create/update operations.
 */
export function mapShopJsonToShopData(
  shopJson: Record<string, unknown>,
  categoryNameToId: Map<string, number>,
): MappedShopData {
  const name = getString(shopJson.name) ?? "";
  const url = getString(shopJson.url) ?? "";
  const description = getString(shopJson.description) ?? "";
  const contactEmail = getString(shopJson.contactEmail) ?? undefined;

  const categoryNames = getStringArray(shopJson.categories);
  const categoryIds = categoryNames
    .map((n) => categoryNameToId.get(n.trim().toLocaleLowerCase("de-DE")) ?? null)
    .filter((id): id is number => id !== null);

  const shippingRegions = getStringArray(shopJson.shippingRegions)
    .map((r) => r.toUpperCase())
    .filter((r): r is (typeof REGION_CODES)[number] =>
      REGION_CODES.includes(r as (typeof REGION_CODES)[number]),
    );

  const socialMediaRaw = getRecord(shopJson.socialMedia);
  const socialMedia: Record<string, string> = {};
  if (socialMediaRaw) {
    for (const [platform, value] of Object.entries(socialMediaRaw)) {
      const normalized = getString(value);
      if (normalized) socialMedia[platform] = normalized;
    }
  }

  const hqRaw = getRecord(shopJson.headquarters);
  const geoRaw = getRecord(shopJson.geo);
  let headquarters: HeadquartersInput | undefined;
  if (hqRaw || geoRaw) {
    headquarters = {
      street: hqRaw ? getString(hqRaw.street) ?? undefined : undefined,
      postalCode: hqRaw ? getString(hqRaw.postalCode) ?? undefined : undefined,
      city: hqRaw ? getString(hqRaw.city) ?? undefined : undefined,
      state: hqRaw ? getString(hqRaw.state) ?? undefined : undefined,
      countryCode: hqRaw ? (getString(hqRaw.countryCode)?.toUpperCase() ?? undefined) : undefined,
      latitude: geoRaw && typeof geoRaw.latitude === "number" ? geoRaw.latitude : undefined,
      longitude: geoRaw && typeof geoRaw.longitude === "number" ? geoRaw.longitude : undefined,
    };
  }

  return {
    name,
    url,
    description,
    region: Array.from(new Set(shippingRegions)),
    categoryIds: Array.from(new Set(categoryIds)),
    contactEmail,
    headquarters,
    socialMedia,
  };
}
