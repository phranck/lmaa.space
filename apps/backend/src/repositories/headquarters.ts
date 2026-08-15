import { and, eq, inArray, isNull } from "drizzle-orm";

import type { ShopHeadquarters } from "@lmaa/shared";

import { db } from "../db/client.js";
import {
  shopGeoCities,
  shopGeoCountries,
  shopGeoRegions,
  shopHeadquarters,
  submissionHeadquarters,
} from "../db/schema.js";

type DbLike = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export interface HeadquartersInput {
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Where the address was read, such as `Impressum` or `Kontaktseite`. */
  addressSource?: string | null;
  /** What produced the coordinates, such as `Photon (street-level)`. */
  geoSource?: string | null;
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function cleanCountryCode(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHeadquartersInput(
  input: HeadquartersInput | null | undefined,
): ShopHeadquarters | null {
  const countryCode = cleanCountryCode(input?.countryCode);
  const street = cleanText(input?.street);
  const postalCode = cleanText(input?.postalCode);
  const city = cleanText(input?.city);
  const state = cleanText(input?.state);
  const latitude = input?.latitude ?? null;
  const longitude = input?.longitude ?? null;
  const addressSource = cleanText(input?.addressSource);
  const geoSource = cleanText(input?.geoSource);

  const hasAnyValue =
    countryCode !== null ||
    street !== null ||
    postalCode !== null ||
    city !== null ||
    state !== null ||
    latitude !== null ||
    longitude !== null;

  if (!hasAnyValue || countryCode === null) {
    return null;
  }

  return {
    street,
    postalCode,
    city,
    state,
    countryCode,
    latitude,
    longitude,
    addressSource,
    geoSource,
  };
}

async function ensureCountry(tx: DbLike, countryCode: string) {
  const [existing] = await tx
    .select({ code: shopGeoCountries.code })
    .from(shopGeoCountries)
    .where(eq(shopGeoCountries.code, countryCode))
    .limit(1);

  if (!existing) {
    await tx.insert(shopGeoCountries).values({ code: countryCode, name: countryCode });
  }

  return countryCode;
}

async function ensureRegion(tx: DbLike, countryCode: string, state: string | null) {
  if (!state) {
    return null;
  }

  const [existing] = await tx
    .select({ id: shopGeoRegions.id })
    .from(shopGeoRegions)
    .where(and(eq(shopGeoRegions.countryCode, countryCode), eq(shopGeoRegions.name, state)))
    .limit(1);

  return (
    existing?.id ??
    (
      await tx
        .insert(shopGeoRegions)
        .values({ countryCode, name: state })
        .returning({ id: shopGeoRegions.id })
    )[0].id
  );
}

async function ensureCity(
  tx: DbLike,
  countryCode: string,
  regionId: number | null,
  city: string | null,
) {
  if (!city) {
    return null;
  }

  const [existing] = await tx
    .select({ id: shopGeoCities.id })
    .from(shopGeoCities)
    .where(
      regionId === null
        ? and(
            eq(shopGeoCities.countryCode, countryCode),
            isNull(shopGeoCities.regionId),
            eq(shopGeoCities.name, city),
          )
        : and(
            eq(shopGeoCities.countryCode, countryCode),
            eq(shopGeoCities.regionId, regionId),
            eq(shopGeoCities.name, city),
          ),
    )
    .limit(1);

  return (
    existing?.id ??
    (
      await tx
        .insert(shopGeoCities)
        .values({ countryCode, regionId, name: city })
        .returning({ id: shopGeoCities.id })
    )[0].id
  );
}

async function resolveReferences(tx: DbLike, input: ShopHeadquarters) {
  await ensureCountry(tx, input.countryCode);
  const regionId = await ensureRegion(tx, input.countryCode, input.state);
  const cityId = await ensureCity(tx, input.countryCode, regionId, input.city);
  return { regionId, cityId };
}

export async function upsertShopHeadquarters(
  tx: DbLike,
  shopId: number,
  input: HeadquartersInput | null | undefined,
) {
  const normalized = normalizeHeadquartersInput(input);
  if (!normalized) {
    await tx.delete(shopHeadquarters).where(eq(shopHeadquarters.shopId, shopId));
    return;
  }

  const [{ regionId, cityId }] = await Promise.all([
    resolveReferences(tx, normalized),
    tx.delete(shopHeadquarters).where(eq(shopHeadquarters.shopId, shopId)),
  ]);
  await tx.insert(shopHeadquarters).values({
    shopId,
    countryCode: normalized.countryCode,
    regionId,
    cityId,
    street: normalized.street,
    postalCode: normalized.postalCode,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    addressSource: normalized.addressSource,
    geoSource: normalized.geoSource,
    updatedAt: new Date(),
  });
}

export async function upsertSubmissionHeadquarters(
  tx: DbLike,
  submissionId: number,
  input: HeadquartersInput | null | undefined,
) {
  const normalized = normalizeHeadquartersInput(input);
  if (!normalized) {
    await tx
      .delete(submissionHeadquarters)
      .where(eq(submissionHeadquarters.submissionId, submissionId));
    return;
  }

  const [{ regionId, cityId }] = await Promise.all([
    resolveReferences(tx, normalized),
    tx.delete(submissionHeadquarters).where(eq(submissionHeadquarters.submissionId, submissionId)),
  ]);
  await tx.insert(submissionHeadquarters).values({
    submissionId,
    countryCode: normalized.countryCode,
    regionId,
    cityId,
    street: normalized.street,
    postalCode: normalized.postalCode,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    addressSource: normalized.addressSource,
    geoSource: normalized.geoSource,
    updatedAt: new Date(),
  });
}

export async function copySubmissionHeadquartersToShop(
  tx: DbLike,
  submissionId: number,
  shopId: number,
) {
  const [row] = await tx
    .select({
      countryCode: submissionHeadquarters.countryCode,
      regionId: submissionHeadquarters.regionId,
      cityId: submissionHeadquarters.cityId,
      street: submissionHeadquarters.street,
      postalCode: submissionHeadquarters.postalCode,
      latitude: submissionHeadquarters.latitude,
      longitude: submissionHeadquarters.longitude,
      addressSource: submissionHeadquarters.addressSource,
      geoSource: submissionHeadquarters.geoSource,
      notes: submissionHeadquarters.notes,
    })
    .from(submissionHeadquarters)
    .where(eq(submissionHeadquarters.submissionId, submissionId))
    .limit(1);

  await tx.delete(shopHeadquarters).where(eq(shopHeadquarters.shopId, shopId));
  if (!row) {
    return;
  }

  await tx.insert(shopHeadquarters).values({
    shopId,
    ...row,
    updatedAt: new Date(),
  });
}

type HeadquartersTable = typeof shopHeadquarters | typeof submissionHeadquarters;

async function loadHeadquartersMap(
  table: HeadquartersTable,
  ids: number[],
  idColumn: "shopId" | "submissionId",
) {
  if (ids.length === 0) {
    return new Map<number, ShopHeadquarters>();
  }

  const tableIdColumn =
    idColumn === "shopId" ? shopHeadquarters.shopId : submissionHeadquarters.submissionId;
  const rows = await db
    .select({
      entityId: tableIdColumn,
      street: table.street,
      postalCode: table.postalCode,
      latitude: table.latitude,
      longitude: table.longitude,
      countryCode: table.countryCode,
      city: shopGeoCities.name,
      state: shopGeoRegions.name,
    })
    .from(table)
    .leftJoin(shopGeoCities, eq(table.cityId, shopGeoCities.id))
    .leftJoin(shopGeoRegions, eq(table.regionId, shopGeoRegions.id))
    .where(inArray(tableIdColumn, ids));

  return new Map(
    rows.map((row) => [
      row.entityId,
      {
        street: row.street,
        postalCode: row.postalCode,
        city: row.city ?? null,
        state: row.state ?? null,
        countryCode: row.countryCode,
        latitude: row.latitude,
        longitude: row.longitude,
      },
    ]),
  );
}

export function loadShopHeadquartersMap(shopIds: number[]) {
  return loadHeadquartersMap(shopHeadquarters, shopIds, "shopId");
}

export function loadSubmissionHeadquartersMap(submissionIds: number[]) {
  return loadHeadquartersMap(submissionHeadquarters, submissionIds, "submissionId");
}
