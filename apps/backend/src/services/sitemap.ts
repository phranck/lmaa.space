import { db } from "../db/client.js";
import { categories } from "../db/schema.js";

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

export async function generateSitemapXml(): Promise<string> {
  const cats = await db
    .select({ slug: categories.slug, updatedAt: categories.updatedAt })
    .from(categories)
    .orderBy(categories.sortOrder);

  const today = new Date().toISOString().split("T")[0];

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

  const entries = [...staticUrls, ...categoryUrls].map(toXmlEntry).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
