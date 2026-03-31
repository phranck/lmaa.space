import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ok, respondError } from "../../lib/http.js";
import { requireAdmin, type AuthVariables } from "../../middleware/auth.js";
import {
  searchManagedUnsplashPhotos,
  triggerManagedUnsplashDownload,
} from "../../services/admin-unsplash.js";

const unsplashDownloadSchema = z.object({
  downloadLocation: z
    .string()
    .url()
    .refine(
      (u) => u.startsWith("https://api.unsplash.com/"),
      "Download URL must be an Unsplash API URL",
    ),
});

/**
 * Admin Unsplash proxy routes (search + download tracking).
 */
export const unsplashRoutes = new Hono<{ Variables: AuthVariables }>();
unsplashRoutes.use("*", requireAdmin);

// Unsplash proxy: search
unsplashRoutes.get("/unsplash/search", async (c) => {
  const q = c.req.query("q") ?? "";
  const page = c.req.query("page") ?? "1";
  const orientation = c.req.query("orientation");
  const orderBy = c.req.query("order_by");
  const color = c.req.query("color");
  try {
    const data = await searchManagedUnsplashPhotos(q, page, orientation, orderBy, color);
    return ok(c, data);
  } catch (error) {
    return respondError(c, error);
  }
});

// Unsplash ToS: trigger download
unsplashRoutes.post("/unsplash/download", zValidator("json", unsplashDownloadSchema), async (c) => {
  const { downloadLocation } = c.req.valid("json");
  const result = await triggerManagedUnsplashDownload(downloadLocation);
  return ok(c, result);
});
