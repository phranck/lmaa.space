import { normalizePaymentMethods, type PaymentMethodKey, type ShopCheckNotes } from "@lmaa/shared";

import type { SubmissionEditData } from "../repositories/admin-submissions.js";
import type { HeadquartersInput } from "../repositories/headquarters.js";

const REGION_CODES = ["DE", "AT", "CH", "EU", "WORLD"] as const;
const REGION_CODE_SET = new Set<string>(REGION_CODES);

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const entry of value) {
    const normalized = getString(entry);
    if (normalized !== null) result.push(normalized);
  }
  return result;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Normalized shop payload produced by `mapShopJsonToShopData`, ready for create/update operations. */
export interface MappedShopData {
  name: string;
  url: string;
  description: string;
  region: string[];
  categoryIds: number[];
  contactEmail?: string;
  headquarters?: HeadquartersInput;
  shopCheckNotes?: ShopCheckNotes | null;
  socialMedia: Record<string, string>;
  paymentMethods?: PaymentMethodKey[];
}

function normalizeStringArray(value: unknown): string[] | undefined {
  const entries = getStringArray(value);
  if (entries.length === 0) return undefined;
  return Array.from(new Set(entries));
}

function mapShopCheckNotes(value: unknown): ShopCheckNotes | null | undefined {
  const raw = getRecord(value);
  if (!raw) return undefined;

  const notes: ShopCheckNotes = {};
  const focus = normalizeStringArray(raw.focus);
  const brandsOrProducts = normalizeStringArray(raw.brandsOrProducts);
  const companyPresentation = getString(raw.companyPresentation);

  if (focus) notes.focus = focus;
  if (brandsOrProducts) notes.brandsOrProducts = brandsOrProducts;
  if (companyPresentation !== null) notes.companyPresentation = companyPresentation;

  return Object.keys(notes).length > 0 ? notes : null;
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
  const shopCheckNotes = mapShopCheckNotes(shopJson.notes);
  const paymentMethods = Array.isArray(shopJson.paymentMethods)
    ? normalizePaymentMethods(shopJson.paymentMethods)
    : undefined;

  const categoryNames = getStringArray(shopJson.categories);
  const categoryIds: number[] = [];
  for (const name of categoryNames) {
    const categoryId = categoryNameToId.get(name.trim().toLocaleLowerCase("de-DE"));
    if (categoryId !== undefined) categoryIds.push(categoryId);
  }

  const shippingRegions: (typeof REGION_CODES)[number][] = [];
  for (const region of getStringArray(shopJson.shippingRegions)) {
    const normalizedRegion = region.toUpperCase();
    if (REGION_CODE_SET.has(normalizedRegion)) {
      shippingRegions.push(normalizedRegion as (typeof REGION_CODES)[number]);
    }
  }

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
      street: hqRaw ? (getString(hqRaw.street) ?? undefined) : undefined,
      postalCode: hqRaw ? (getString(hqRaw.postalCode) ?? undefined) : undefined,
      city: hqRaw ? (getString(hqRaw.city) ?? undefined) : undefined,
      state: hqRaw ? (getString(hqRaw.state) ?? undefined) : undefined,
      countryCode: hqRaw ? (getString(hqRaw.countryCode)?.toUpperCase() ?? undefined) : undefined,
      latitude: geoRaw && typeof geoRaw.latitude === "number" ? geoRaw.latitude : undefined,
      longitude: geoRaw && typeof geoRaw.longitude === "number" ? geoRaw.longitude : undefined,
      // Where each of the two came from. An address without its origin cannot
      // be checked by whoever reviews it, and the check is the only place that
      // knows it.
      addressSource: hqRaw ? (getString(hqRaw.source) ?? undefined) : undefined,
      geoSource: geoRaw ? (getString(geoRaw.source) ?? undefined) : undefined,
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
    shopCheckNotes,
    socialMedia,
    ...(paymentMethods !== undefined ? { paymentMethods } : {}),
  };
}

/**
 * Maps shop-check JSON onto the fields of a submission edit.
 *
 * @param shopJson - Raw shop-check JSON, from the import route or an automated review.
 * @param categoryNameToId - Lowercased category names to their ids.
 * @returns The submission fields the mapping produced.
 *
 * @remarks
 * Both the manual import and the automated reviewer write the same researched
 * data into a submission, so they share this mapping. A second copy would drift
 * the first time a field is added on one path only.
 */
export function mapShopJsonToSubmissionEditData(
  shopJson: Record<string, unknown>,
  categoryNameToId: Map<string, number>,
): SubmissionEditData {
  const mapped = mapShopJsonToShopData(shopJson, categoryNameToId);
  return {
    shopName: mapped.name,
    shopUrl: mapped.url,
    description: mapped.description,
    region: mapped.region,
    categoryIds: mapped.categoryIds,
    contactEmail: mapped.contactEmail,
    headquarters: mapped.headquarters,
    shopCheckNotes: mapped.shopCheckNotes,
    socialMedia: mapped.socialMedia,
    paymentMethods: mapped.paymentMethods,
  };
}
