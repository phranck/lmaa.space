import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

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

  const json = (await res.json()) as { results: UnsplashPhoto[]; total: number };
  const results = json.results.map((p) => ({
    id: p.id,
    urls: { small: p.urls.small, regular: p.urls.regular },
    user: { name: p.user.name, link: p.user.links.html },
    downloadLocation: p.links.download_location,
  }));
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
