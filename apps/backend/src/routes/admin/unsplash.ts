import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { ok, respondError } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import { searchUnsplashPhotos, triggerUnsplashDownload } from "../../services/unsplash.js";

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
  try {
    const data = await searchUnsplashPhotos(q, page);
    return ok(c, data);
  } catch (error) {
    return respondError(c, error);
  }
});

// Unsplash ToS: trigger download
unsplashRoutes.post(
  "/unsplash/download",
  requireAuth,
  zValidator("json", unsplashDownloadSchema),
  async (c) => {
    const { downloadLocation } = c.req.valid("json");
    const okResult = await triggerUnsplashDownload(downloadLocation);
    return ok(c, { ok: okResult });
  },
);
