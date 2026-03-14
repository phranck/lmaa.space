import { existsSync } from "node:fs";

import { readJson, writeJson } from "../lib/utils";
import { PATHS } from "../paths";

const CATEGORIES_API_URL = "https://lmaa.space/api/v1/categories";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CategoriesCache = {
  fetchedAt: string;
  names: string[];
};

type CategoryApiItem = { name?: string; title?: string };
type CategoryApiResponse = CategoryApiItem[] | { data: CategoryApiItem[] };

function normalizeNames(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

export async function loadCategoriesCached(userAgent: string): Promise<string[]> {
  const now = Date.now();
  if (existsSync(PATHS.categoriesCache)) {
    const cached = readJson<CategoriesCache | null>(PATHS.categoriesCache, null);
    if (cached?.fetchedAt && Array.isArray(cached.names)) {
      const age = now - new Date(cached.fetchedAt).getTime();
      if (Number.isFinite(age) && age >= 0 && age < CACHE_TTL_MS && cached.names.length > 0) {
        return normalizeNames(cached.names);
      }
    }
  }

  try {
    const res = await fetch(CATEGORIES_API_URL, {
      headers: { "user-agent": userAgent, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = (await res.json()) as CategoryApiResponse;
    const items = Array.isArray(payload) ? payload : payload.data;
    const names = normalizeNames(items.map((row) => String(row.name ?? row.title ?? "")).filter(Boolean));
    writeJson(PATHS.categoriesCache, { fetchedAt: new Date().toISOString(), names });
    return names;
  } catch {
    const fallback = readJson<CategoriesCache | null>(PATHS.categoriesCache, null);
    return normalizeNames(fallback?.names ?? []);
  }
}
