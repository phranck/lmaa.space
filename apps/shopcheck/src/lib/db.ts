import postgres from "postgres";

import { LOCAL_DB_URL } from "../constants";
import { PATHS } from "../paths";
import type { Shop } from "../types";
import { readJson } from "./utils";

export async function loadShops(): Promise<Shop[]> {
  try {
    const sql = postgres(LOCAL_DB_URL, { max: 1 });
    const rows = await sql`
      SELECT s.id, s.name, s.url
      FROM shops s
      LEFT JOIN shop_headquarters h ON h.shop_id = s.id
      WHERE s.visibility = 'public'
        AND s.is_active = true
        AND (h.shop_id IS NULL OR h.latitude IS NULL OR h.longitude IS NULL)
      ORDER BY s.id
    `;
    await sql.end({ timeout: 5 });
    return rows.map((row) => ({ id: row.id as number, name: row.name as string, url: row.url as string }));
  } catch {
    const fallback = readJson<Array<Partial<Shop>>>(PATHS.inputFallback, []);
    return fallback
      .filter((item) => item && typeof item.id === "number" && typeof item.url === "string")
      .map((item) => ({ id: item.id as number, name: item.name ?? (item.url as string), url: item.url as string }));
  }
}
