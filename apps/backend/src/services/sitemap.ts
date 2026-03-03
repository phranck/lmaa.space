import { db } from "../db/index.js";
import { categories } from "../db/schema.js";

const BASE = "https://lmaa.space";

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function toXmlEntry(u: SitemapUrl): string {
  return `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
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
