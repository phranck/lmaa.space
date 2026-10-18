import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { categories, shopSlugs, shops } from "../db/schema.js";

const BASE = "https://lmaa.space";

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

/** Escapes XML metacharacters so dynamic values (e.g. category slugs) cannot break the document or inject nodes. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXmlEntry(u: SitemapUrl): string {
  return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n    <changefreq>${escapeXml(u.changefreq)}</changefreq>\n    <priority>${escapeXml(u.priority)}</priority>\n  </url>`;
}

interface SitemapCategory {
  slug: string;
  updatedAt: Date | string;
}

interface SitemapShop {
  slug: string;
  updatedAt: Date | string;
}

/**
 * Renders the public sitemap from already selected visible records.
 *
 * @param cats - Public category paths and modification times.
 * @param publicShops - Canonical slugs for visible shops only.
 * @param today - ISO date used for static routes.
 * @returns Complete XML sitemap document.
 */
export function renderSitemapXml(
  cats: SitemapCategory[],
  publicShops: SitemapShop[],
  today: string,
): string {
  const staticUrls: SitemapUrl[] = [
    { loc: `${BASE}/`, changefreq: "daily", priority: "1.0", lastmod: today },
    { loc: `${BASE}/search`, changefreq: "weekly", priority: "0.5", lastmod: today },
    { loc: `${BASE}/suggestion`, changefreq: "monthly", priority: "0.4", lastmod: today },
    { loc: `${BASE}/about`, changefreq: "monthly", priority: "0.3", lastmod: today },
    { loc: `${BASE}/impressum`, changefreq: "yearly", priority: "0.1", lastmod: today },
    { loc: `${BASE}/datenschutz`, changefreq: "yearly", priority: "0.1", lastmod: today },
  ];

  const categoryUrls: SitemapUrl[] = cats.map((cat) => ({
    loc: `${BASE}/category/${cat.slug}`,
    changefreq: "weekly",
    priority: "0.8",
    lastmod: new Date(cat.updatedAt).toISOString().split("T")[0],
  }));

  const shopUrls: SitemapUrl[] = publicShops.map((shop) => ({
    loc: `${BASE}/shop/${shop.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    lastmod: new Date(shop.updatedAt).toISOString().split("T")[0],
  }));

  const entries = [...staticUrls, ...categoryUrls, ...shopUrls].map(toXmlEntry).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

/**
 * Loads visible canonical routes and renders the XML sitemap.
 *
 * @returns Complete XML sitemap for static, category, and public shop pages.
 */
export async function generateSitemapXml(): Promise<string> {
  const [cats, publicShops] = await Promise.all([
    db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .orderBy(categories.sortOrder),
    db
      .select({ slug: shopSlugs.slug, updatedAt: shops.updatedAt })
      .from(shopSlugs)
      .innerJoin(
        shops,
        and(
          eq(shops.id, shopSlugs.shopId),
          eq(shops.isActive, true),
          eq(shops.visibility, "public"),
        ),
      )
      .where(eq(shopSlugs.canonical, true))
      .orderBy(shopSlugs.slug),
  ]);

  return renderSitemapXml(cats, publicShops, new Date().toISOString().split("T")[0]);
}
