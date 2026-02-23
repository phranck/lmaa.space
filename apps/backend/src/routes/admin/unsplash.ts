import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

const unsplashDownloadSchema = z.object({
  downloadLocation: z
    .string()
    .url()
    .refine(
      (u) => u.startsWith("https://api.unsplash.com/"),
      "Download URL must be an Unsplash API URL",
    ),
});

export const unsplashRoutes = new Hono<{ Variables: AuthVariables }>();

// Unsplash proxy: search
unsplashRoutes.get("/unsplash/search", requireAuth, async (c) => {
  const q = c.req.query("q") ?? "";
  const page = c.req.query("page") ?? "1";
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return c.json({ error: { message: "Unsplash not configured" } }, 503);
  if (!q) return c.json({ data: { results: [], total: 0 } });

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=30&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) return c.json({ error: { message: "Unsplash request failed" } }, 502);

  const json = (await res.json()) as { results: unknown[]; total: number };
  const results = (json.results as Array<Record<string, unknown>>).map((p) => {
    const urls = p.urls as Record<string, string>;
    const user = p.user as Record<string, unknown>;
    const links = p.links as Record<string, string>;
    const userLinks = user.links as Record<string, string>;
    return {
      id: p.id,
      urls: { small: urls.small, regular: urls.regular },
      user: { name: user.name, link: userLinks.html },
      downloadLocation: links.download_location,
    };
  });
  return c.json({ data: { results, total: json.total } });
});

// Unsplash ToS: trigger download
unsplashRoutes.post(
  "/unsplash/download",
  requireAuth,
  zValidator("json", unsplashDownloadSchema),
  async (c) => {
    const { downloadLocation } = c.req.valid("json");
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return c.json({ data: { ok: false } });
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(
      () => {},
    );
    return c.json({ data: { ok: true } });
  },
);
