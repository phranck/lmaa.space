import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { mediaUpdateSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  deleteManagedMediaAsset,
  listManagedMediaAssets,
  updateManagedMediaAsset,
  uploadManagedMediaAsset,
} from "../../services/admin-media.js";

/**
 * Admin media library routes.
 */
export const mediaRoutes = new Hono<{ Variables: AuthVariables }>();

mediaRoutes.get("/media", requireAdmin, async (c) => {
  const assets = await listManagedMediaAssets();
  return ok(c, assets);
});

mediaRoutes.post("/media", requireAdmin, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  const adminId = c.get("adminId");

  const result = await uploadManagedMediaAsset({ file, adminId });
  if (!result.ok) {
    if (result.reason === "missing_file") return fail(c, 400, "No file provided");
    if (result.reason === "too_large") return fail(c, 400, "File too large (max 10 MB)");
    if (result.reason === "invalid_file")
      return fail(c, 400, "Unsupported file type. Allowed: images, PDF, TXT, MD, CSV, DOC(X), XLS(X), PPT(X)");
    return fail(c, 500, "Failed to store file");
  }

  return ok(c, result.asset, 201);
});

mediaRoutes.patch(
  "/media/:id",
  requireAdmin,
  zValidator("json", mediaUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");

    const { displayName, alias } = c.req.valid("json");
    const result = await updateManagedMediaAsset(id, { displayName, alias });
    if (!result.ok) return fail(c, 404, "Media asset not found");

    return ok(c, result.asset);
  },
);

mediaRoutes.delete("/media/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await deleteManagedMediaAsset(id);
  if (!result.ok) return fail(c, 404, "Media asset not found");

  return ok(c, { message: "Deleted" });
});
