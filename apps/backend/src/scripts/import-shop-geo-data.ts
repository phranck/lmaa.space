import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  shopGeoCities,
  shopGeoCountries,
  shopGeoRegions,
  shopHeadquarters,
  shops,
} from "../db/schema.js";

interface ShopGeoJson {
  meta: {
    generated: string;
    totalShops: number;
    withAddress: number;
    withGeo: number;
  };
  shops: ShopGeoEntry[];
}

interface ShopGeoEntry {
  shopId: number;
  shopName: string;
  shopUrl: string;
  headquarters: {
    street?: string;
    zip?: string;
    city?: string;
    state?: string;
    country: string;
    source?: string;
  } | null;
  geo: {
    lat: number;
    lng: number;
    source?: string;
  } | null;
  notes?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.resolve(__dirname, "../../../../shop-geo-data.json");

function normalizeKey(value: string | null | undefined) {
  return (value ?? "").trim();
}

function regionKey(countryCode: string, regionName: string) {
  return `${countryCode}::${regionName}`;
}

function cityKey(countryCode: string, regionName: string | null, cityName: string) {
  return `${countryCode}::${regionName ?? ""}::${cityName}`;
}

function countryNameFromCode(code: string) {
  try {
    const displayNames = new Intl.DisplayNames(["de", "en"], { type: "region" });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

async function main() {
  const raw = await readFile(JSON_PATH, "utf8");
  const parsed = JSON.parse(raw) as ShopGeoJson;
  const entries = parsed.shops.filter((entry) => entry.headquarters && entry.geo);

  const shopIds = entries.map((entry) => entry.shopId);
  const existingShops =
    shopIds.length > 0
      ? await db
          .select({ id: shops.id, url: shops.url, name: shops.name })
          .from(shops)
          .where(inArray(shops.id, shopIds))
      : [];
  const existingShopById = new Map(existingShops.map((shop) => [shop.id, shop]));

  const missingShopIds = shopIds.filter((shopId) => !existingShopById.has(shopId));
  if (missingShopIds.length > 0) {
    console.warn(`Skipping ${missingShopIds.length} geo entries because the shop id is missing.`);
  }

  const countries = new Map<string, { code: string; name: string }>();
  const regions = new Map<string, { countryCode: string; name: string }>();
  const cities = new Map<string, { countryCode: string; regionKey: string | null; name: string }>();

  for (const entry of entries) {
    if (!existingShopById.has(entry.shopId)) continue;

    const headquarters = entry.headquarters!;
    const countryCode = normalizeKey(headquarters.country).toUpperCase();
    if (!countryCode) continue;

    countries.set(countryCode, {
      code: countryCode,
      name: countryNameFromCode(countryCode),
    });

    const regionName = normalizeKey(headquarters.state) || null;
    const cityName = normalizeKey(headquarters.city) || null;
    const normalizedRegionKey = regionName ? regionKey(countryCode, regionName) : null;

    if (regionName) {
      regions.set(normalizedRegionKey!, {
        countryCode,
        name: regionName,
      });
    }

    if (cityName) {
      cities.set(cityKey(countryCode, regionName, cityName), {
        countryCode,
        regionKey: normalizedRegionKey,
        name: cityName,
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(shopHeadquarters);
    await tx.delete(shopGeoCities);
    await tx.delete(shopGeoRegions);
    await tx.delete(shopGeoCountries);

    if (countries.size > 0) {
      await tx.insert(shopGeoCountries).values([...countries.values()]);
    }

    const regionIdByKey = new Map<string, number>();
    for (const [key, region] of regions.entries()) {
      const [inserted] = await tx
        .insert(shopGeoRegions)
        .values(region)
        .returning({ id: shopGeoRegions.id });
      regionIdByKey.set(key, inserted.id);
    }

    const cityIdByKey = new Map<string, number>();
    for (const [key, city] of cities.entries()) {
      const [inserted] = await tx
        .insert(shopGeoCities)
        .values({
          countryCode: city.countryCode,
          regionId: city.regionKey ? (regionIdByKey.get(city.regionKey) ?? null) : null,
          name: city.name,
        })
        .returning({ id: shopGeoCities.id });
      cityIdByKey.set(key, inserted.id);
    }

    const headquartersRows = entries
      .filter((entry) => existingShopById.has(entry.shopId))
      .map((entry) => {
        const headquarters = entry.headquarters!;
        const geo = entry.geo!;
        const countryCode = normalizeKey(headquarters.country).toUpperCase();
        const regionName = normalizeKey(headquarters.state) || null;
        const cityName = normalizeKey(headquarters.city) || null;
        const normalizedRegionKey = regionName ? regionKey(countryCode, regionName) : null;
        const normalizedCityKey = cityName ? cityKey(countryCode, regionName, cityName) : null;

        return {
          shopId: entry.shopId,
          countryCode,
          regionId: normalizedRegionKey ? (regionIdByKey.get(normalizedRegionKey) ?? null) : null,
          cityId: normalizedCityKey ? (cityIdByKey.get(normalizedCityKey) ?? null) : null,
          street: normalizeKey(headquarters.street) || null,
          postalCode: normalizeKey(headquarters.zip) || null,
          latitude: geo.lat,
          longitude: geo.lng,
          addressSource: normalizeKey(headquarters.source) || null,
          geoSource: normalizeKey(geo.source) || null,
          notes: normalizeKey(entry.notes),
        };
      });

    if (headquartersRows.length > 0) {
      await tx.insert(shopHeadquarters).values(headquartersRows);
    }
  });

  console.log(
    `Imported ${entries.length - missingShopIds.length} shop headquarters from ${path.basename(JSON_PATH)}.`,
  );
  console.log(
    `Countries: ${countries.size}, regions: ${regions.size}, cities: ${cities.size}, skipped shops: ${missingShopIds.length}.`,
  );
}

main()
  .catch((error) => {
    console.error("Shop geo import failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$client.end();
  });
