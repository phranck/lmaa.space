import { Hono } from "hono";

import { logger } from "../lib/logger.js";
import { generateSitemapXml } from "../services/sitemap.js";

/** Hono router that serves the XML sitemap at `/sitemap.xml`. */
export const sitemapRoutes = new Hono();

sitemapRoutes.get("/sitemap.xml", async (c) => {
  try {
    const xml = await generateSitemapXml();
    return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
  } catch (err) {
    logger.error({ err }, "sitemap generation failed");
    return c.body("", 500);
  }
});
