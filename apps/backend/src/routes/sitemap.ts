import { Hono } from "hono";
import { generateSitemapXml } from "../services/sitemap.js";

export const sitemapRoutes = new Hono();

sitemapRoutes.get("/sitemap.xml", async (c) => {
  try {
    const xml = await generateSitemapXml();
    return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    return c.body("", 500);
  }
});
