/**
 * Backfill script: fetches a preview image for shops that don't have one yet.
 * Run via: npm run db:fetch-og (in apps/backend)
 */

import { eq, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { shops } from "../db/schema.js";
import { fetchPreviewImage } from "../lib/og.js";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  const pending = await db
    .select({ id: shops.id, name: shops.name, url: shops.url })
    .from(shops)
    .where(or(isNull(shops.ogImage), eq(shops.ogImage, "")));

  console.log(`Fetching preview image for ${pending.length} shops…\n`);

  const counts: Record<string, number> = {};
  let failed = 0;

  for (const shop of pending) {
    const result = await fetchPreviewImage(shop.url);
    await db
      .update(shops)
      .set({ ogImage: result?.url ?? "" })
      .where(eq(shops.id, shop.id));

    if (result) {
      counts[result.via] = (counts[result.via] ?? 0) + 1;
      console.log(`  ✓ ${shop.name} (${result.via})`);
    } else {
      console.log(`  ✗ ${shop.name}`);
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\nDone. ${total} found, ${failed} not found.`);
  for (const [via, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${via}: ${count}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
