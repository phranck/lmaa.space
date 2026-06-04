import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { mediaUpdateSchema } from "@lmaa/contracts";
import { MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  completeManagedHlsBundleUpload,
  deleteManagedMediaAsset,
  listManagedMediaAssets,
  syncMediaFromStorage,
  uploadManagedHlsBundleChunk,
  uploadManagedHlsBundle,
  updateManagedMediaAsset,
  uploadManagedMediaAsset,
} from "../../services/admin-media.js";

/**
 * Admin media library routes.
 */
export const mediaRoutes = new Hono<{ Variables: AuthVariables }>();

const hlsBundleCompleteSchema = z.object({
  files: z
    .array(
      z.object({
        relativePath: z.string().min(1),
        sizeBytes: z.number().int().nonnegative(),
      }),
    )
    .min(1),
  folderId: z.number().int().nullable().optional(),
  name: z.string().min(1).max(200),
  overwrite: z.boolean().optional(),
  sessionId: z.string().min(1),
});

function parseOptionalFolderId(value: FormDataEntryValue | null): number | null | undefined {
  if (value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

mediaRoutes.get("/media", requireAdmin, async (c) => {
  const assets = await listManagedMediaAssets();
  return ok(c, assets);
});

mediaRoutes.post("/media", requireAdmin, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  const displayName = formData.get("displayName");
  const overwrite = formData.get("overwrite") === "true";
  const folderId = parseOptionalFolderId(formData.get("folderId"));
  if (folderId === null) return fail(c, 400, "Invalid folder id");
  const adminId = c.get("adminId");

  const result = await uploadManagedMediaAsset({
    file,
    adminId,
    displayName: typeof displayName === "string" ? displayName : undefined,
    folderId,
    overwrite,
  });
  if (!result.ok) {
    if (result.reason === "missing_file") return fail(c, 400, "No file provided");
    if (result.reason === "name_conflict")
      return fail(c, 409, "Media asset name already exists", "MEDIA_NAME_CONFLICT");
    if (result.reason === "too_large")
      return fail(c, 413, `File too large (max ${MEDIA_UPLOAD_MAX_LABEL})`, "PAYLOAD_TOO_LARGE");
    if (result.reason === "invalid_file")
      return fail(
        c,
        400,
        "Unsupported file type. Allowed: images, MP4, PDF, TXT, MD, CSV, DOC(X), XLS(X), PPT(X)",
      );
    return fail(c, 500, "Failed to store file");
  }

  return ok(c, result.asset, 201);
});

mediaRoutes.post("/media/bundles/hls", requireAdmin, async (c) => {
  const formData = await c.req.formData();
  const displayName = formData.get("name");
  const files = formData.getAll("files");
  const paths = formData.getAll("paths");
  const overwrite = formData.get("overwrite") === "true";
  const folderId = parseOptionalFolderId(formData.get("folderId"));
  if (folderId === null) return fail(c, 400, "Invalid folder id");
  const adminId = c.get("adminId");

  if (files.length === 0 || files.length !== paths.length) {
    return fail(c, 400, "Invalid HLS bundle upload");
  }

  const result = await uploadManagedHlsBundle({
    displayName: typeof displayName === "string" ? displayName : "HLS bundle",
    files: files.map((file, index) => ({
      file,
      relativePath: typeof paths[index] === "string" ? paths[index] : "",
    })),
    adminId,
    folderId,
    overwrite,
  });

  if (!result.ok) {
    if (result.reason === "missing_file") return fail(c, 400, "No files provided");
    if (result.reason === "name_conflict")
      return fail(c, 409, "Media asset name already exists", "MEDIA_NAME_CONFLICT");
    if (result.reason === "too_large")
      return fail(c, 413, `Bundle too large (max ${MEDIA_UPLOAD_MAX_LABEL})`, "PAYLOAD_TOO_LARGE");
    if (result.reason === "invalid_bundle")
      return fail(
        c,
        400,
        "Invalid HLS bundle. Required: one .m3u8 manifest, referenced .ts segments, optional poster.jpg/.jpeg/.png/.webp",
      );
    if (result.reason === "invalid_file")
      return fail(
        c,
        400,
        "Unsupported bundle file type. Allowed: .m3u8, .ts, poster.jpg/.jpeg/.png/.webp",
      );
    return fail(c, 500, "Failed to store HLS bundle");
  }

  return ok(c, result.asset, 201);
});

mediaRoutes.post("/media/bundles/hls/chunks", requireAdmin, async (c) => {
  const formData = await c.req.formData();
  const sessionId = formData.get("sessionId");
  const files = formData.getAll("files");
  const paths = formData.getAll("paths");

  if (typeof sessionId !== "string" || files.length === 0 || files.length !== paths.length) {
    return fail(c, 400, "Invalid HLS bundle chunk upload");
  }

  const result = await uploadManagedHlsBundleChunk({
    sessionId,
    files: files.map((file, index) => ({
      file,
      relativePath: typeof paths[index] === "string" ? paths[index] : "",
    })),
  });

  if (!result.ok) {
    if (result.reason === "missing_file") return fail(c, 400, "No files provided");
    if (result.reason === "too_large")
      return fail(c, 413, `Chunk too large (max ${MEDIA_UPLOAD_MAX_LABEL})`, "PAYLOAD_TOO_LARGE");
    if (result.reason === "invalid_bundle" || result.reason === "invalid_file")
      return fail(
        c,
        400,
        "Unsupported bundle file type. Allowed: .m3u8, .ts, poster.jpg/.jpeg/.png/.webp",
      );
    return fail(c, 500, "Failed to stage HLS bundle chunk");
  }

  return ok(c, result);
});

mediaRoutes.post(
  "/media/bundles/hls/complete",
  requireAdmin,
  zValidator("json", hlsBundleCompleteSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const adminId = c.get("adminId");

    const result = await completeManagedHlsBundleUpload({
      adminId,
      displayName: payload.name,
      files: payload.files,
      folderId: payload.folderId,
      overwrite: payload.overwrite,
      sessionId: payload.sessionId,
    });

    if (!result.ok) {
      if (result.reason === "missing_file") return fail(c, 400, "No files provided");
      if (result.reason === "name_conflict")
        return fail(c, 409, "Media asset name already exists", "MEDIA_NAME_CONFLICT");
      if (result.reason === "invalid_bundle")
        return fail(
          c,
          400,
          "Invalid HLS bundle. Required: one .m3u8 manifest, referenced .ts segments, optional poster.jpg/.jpeg/.png/.webp",
        );
      if (result.reason === "invalid_file")
        return fail(
          c,
          400,
          "Unsupported bundle file type. Allowed: .m3u8, .ts, poster.jpg/.jpeg/.png/.webp",
        );
      return fail(c, 500, "Failed to finalize HLS bundle");
    }

    return ok(c, result.asset, 201);
  },
);

mediaRoutes.patch("/media/:id", requireAdmin, zValidator("json", mediaUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const { displayName, alias, folderId } = c.req.valid("json");
  const result = await updateManagedMediaAsset(id, { displayName, alias, folderId });
  if (!result.ok) return fail(c, 404, "Media asset not found");

  return ok(c, result.asset);
});

mediaRoutes.post("/media/sync", requireAdmin, async (c) => {
  const result = await syncMediaFromStorage();
  return ok(c, result);
});

mediaRoutes.delete("/media/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await deleteManagedMediaAsset(id);
  if (!result.ok) return fail(c, 404, "Media asset not found");

  return ok(c, { message: "Deleted" });
});
