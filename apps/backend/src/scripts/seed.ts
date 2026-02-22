/**
 * Seed script: imports shops and categories from the Codeberg "Amazon-Alternativen" repo.
 * Run with: bun run apps/backend/src/scripts/seed.ts
 */

import Database from "better-sqlite3";

const DB_PATH = process.env.DATABASE_PATH ?? "./deinshop.db";
const BASE_URL =
  "https://codeberg.org/api/v1/repos/phranck/Amazon-Alternativen/raw/categories";

interface CategoryDef {
  file: string;
  slug: string;
}

const CATEGORIES: CategoryDef[] = [
  { file: "3d-printing.md", slug: "3d-druck" },
  { file: "astronomy.md", slug: "astronomie" },
  { file: "bicycles.md", slug: "fahrraeder" },
  { file: "board-games.md", slug: "brettspiele" },
  { file: "books.md", slug: "buecher" },
  { file: "cannabis.md", slug: "cannabis" },
  { file: "clothes.md", slug: "klamotten" },
  { file: "computer.md", slug: "computer" },
  { file: "consumer-electronics.md", slug: "unterhaltungselektronik" },
  { file: "drugstore.md", slug: "kosmetik-drogerie" },
  { file: "entertainment.md", slug: "musik-foto-video" },
  { file: "general.md", slug: "allgemein" },
  { file: "health.md", slug: "gesundheit-apotheken" },
  { file: "kids.md", slug: "babys-kinder" },
  { file: "living.md", slug: "wohnen" },
  { file: "modellbau.md", slug: "modellbau" },
  { file: "nutrition.md", slug: "ernaehrung" },
  { file: "pets.md", slug: "haustiere" },
  { file: "presents.md", slug: "geschenke-kunst" },
  { file: "refurbished.md", slug: "refurbished" },
  { file: "renewable-energies.md", slug: "erneuerbare-energien" },
  { file: "retro-computer.md", slug: "retro-computer" },
  { file: "smart-home.md", slug: "smart-home" },
  { file: "sports.md", slug: "sport" },
  { file: "stationary.md", slug: "schreibwaren-buero" },
  { file: "tools-diy.md", slug: "werkzeuge-diy" },
];

interface ShopEntry {
  name: string;
  url: string;
  description: string;
}

function parseHeading(text: string): { icon: string; name: string } | null {
  // Match "## 📚 Bücher" or "# 🏀 Sport" or "👶 Babys / Kinder"
  const m = text.match(/^#{1,3}\s*([\p{Emoji}\p{So}️\u200d]+\s*)(.+)/u);
  if (m) {
    return { icon: m[1].trim(), name: m[2].trim() };
  }
  // Fallback: no emoji
  const m2 = text.match(/^#{1,3}\s+(.+)/);
  if (m2) return { icon: "", name: m2[1].trim() };
  return null;
}

function parseListShops(text: string): ShopEntry[] {
  const shops: ShopEntry[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Standard entry: * [Name](URL)
    const match = line.match(/^\*\s+\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      const name = match[1].trim();
      const url = match[2].trim();

      // Description may follow on same line after backslash or on next line
      let description = "";
      const afterLink = line.slice(match[0].length).trim();
      if (afterLink && afterLink !== "\\") {
        description = afterLink.replace(/^[\\–-]\s*/, "").trim();
      } else if (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next && !next.startsWith("*") && !next.startsWith("#") && !next.startsWith("|")) {
          description = next.replace(/^[\\–-]\s*/, "").trim();
          i++; // consume description line
        }
      }

      if (name && url.startsWith("http")) {
        shops.push({ name, url, description });
      }
    }

    // Multi-country entry: * Name: [🇩🇪](url) / [🇦🇹](url2) ...
    // Take only the first URL
    const multiMatch = line.match(/^\*\s+[^[]+:\s+\[.+?\]\(([^)]+)\)/);
    if (!match && multiMatch) {
      // Extract name from text before ":"
      const nameMatch = line.match(/^\*\s+([^:]+):/);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const url = multiMatch[1].trim();
        const afterAll = line.replace(/^\*\s+[^\\]+/, "").trim();
        let description = "";
        if (afterAll && afterAll !== "\\") {
          description = afterAll.replace(/^[\\–-]\s*/, "").trim();
        } else if (i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          if (next && !next.startsWith("*") && !next.startsWith("#") && !next.startsWith("|")) {
            description = next.replace(/^[\\–-]\s*/, "").trim();
            i++;
          }
        }
        if (name && url.startsWith("http")) {
          shops.push({ name, url, description });
        }
      }
    }
  }

  return shops;
}

function parseTableShops(text: string): ShopEntry[] {
  const shops: ShopEntry[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.includes("|")) continue;
    if (line.match(/^[\|:\s-]+$/)) continue; // header separator

    // Extract first cell which should contain [Name](URL)
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (!cells.length) continue;

    const firstCell = cells[0];
    const linkMatch = firstCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!linkMatch) continue;

    const name = linkMatch[1].trim();
    const url = linkMatch[2].trim();
    // Description comes from the last cell (Produktpalette)
    const description = cells[cells.length - 1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (name && url.startsWith("http")) {
      shops.push({ name, url, description: description === name ? "" : description });
    }
  }

  return shops;
}

function parseContent(text: string): {
  heading: { icon: string; name: string } | null;
  shops: ShopEntry[];
} {
  const lines = text.split("\n");

  // Find the first heading
  let heading: { icon: string; name: string } | null = null;
  for (const line of lines) {
    if (line.match(/^#{1,3}\s/)) {
      heading = parseHeading(line);
      if (heading) break;
    }
    // Heading without # (e.g. "👶 Babys / Kinder")
    if (!heading && line.match(/^[\p{Emoji}]/u)) {
      const emoji = line.match(/^([\p{Emoji}\p{So}️\u200d]+\s*)(.+)/u);
      if (emoji) {
        heading = { icon: emoji[1].trim(), name: emoji[2].trim() };
        break;
      }
    }
  }

  // Choose parser based on presence of markdown tables
  const isTableFormat = text.includes("| :---") || text.includes("|:---");
  const shops = isTableFormat ? parseTableShops(text) : parseListShops(text);

  return { heading, shops };
}

async function main() {
  console.log(`Connecting to database at ${DB_PATH}...`);
  const sqlite = new Database(DB_PATH);
  sqlite.exec("PRAGMA foreign_keys = ON;");

  let totalCategories = 0;
  let totalShops = 0;

  for (const { file, slug } of CATEGORIES) {
    const url = `${BASE_URL}/${file}`;
    console.log(`\nFetching ${file}...`);

    let text: string;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  ⚠ HTTP ${res.status} – skipping`);
        continue;
      }
      text = await res.text();
    } catch (err) {
      console.warn(`  ⚠ Fetch failed: ${err} – skipping`);
      continue;
    }

    const { heading, shops } = parseContent(text);
    if (!heading) {
      console.warn(`  ⚠ Could not parse heading – skipping`);
      continue;
    }

    console.log(`  Category: ${heading.icon} ${heading.name} (${shops.length} shops)`);

    // Upsert category
    const existing = sqlite
      .prepare("SELECT id FROM categories WHERE slug = ?")
      .get(slug) as { id: number } | undefined;

    let categoryId: number;
    if (existing) {
      sqlite
        .prepare("UPDATE categories SET name = ?, icon = ? WHERE id = ?")
        .run(heading.name, heading.icon, existing.id);
      categoryId = existing.id;
    } else {
      const result = sqlite
        .prepare("INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)")
        .run(heading.name, slug, heading.icon);
      categoryId = Number(result.lastInsertRowid);
      totalCategories++;
    }

    // Insert shops (skip duplicates by URL)
    for (const shop of shops) {
      const existingShop = sqlite
        .prepare("SELECT id FROM shops WHERE url = ?")
        .get(shop.url) as { id: number } | undefined;

      if (!existingShop) {
        sqlite
          .prepare(
            "INSERT INTO shops (name, url, category_id, description) VALUES (?, ?, ?, ?)",
          )
          .run(shop.name, shop.url, categoryId, shop.description);
        totalShops++;
        console.log(`    + ${shop.name}`);
      }
    }
  }

  sqlite.close();
  console.log(`\n✅ Done: ${totalCategories} categories, ${totalShops} shops imported.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
