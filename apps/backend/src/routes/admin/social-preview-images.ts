import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  socialPreviewActiveSchema,
  socialPreviewCreateSchema,
  socialPreviewProjectCreateSchema,
  socialPreviewProjectUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createManagedSocialPreviewImage,
  createManagedSocialPreviewProject,
  deleteManagedSocialPreviewImage,
  deleteManagedSocialPreviewProject,
  listManagedSocialPreviewImages,
  listManagedSocialPreviewProjects,
  setManagedSocialPreviewImageActive,
  updateManagedSocialPreviewProject,
  uploadManagedSocialPreviewAsset,
} from "../../services/social-preview-images.js";

/**
 * Admin social-preview image management routes.
 */
export const socialPreviewImageRoutes = new Hono<{ Variables: AuthVariables }>();

socialPreviewImageRoutes.get("/social-preview-projects", requireAdmin, async (c) => {
  const projects = await listManagedSocialPreviewProjects();
  return ok(c, projects);
});

socialPreviewImageRoutes.post(
  "/social-preview-projects",
  requireAdmin,
  zValidator("json", socialPreviewProjectCreateSchema),
  async (c) => {
    const body = c.req.valid("json");
    const project = await createManagedSocialPreviewProject({
      ...body,
      createdBy: c.get("adminId") ?? null,
    });
    return ok(c, project, 201);
  },
);

socialPreviewImageRoutes.patch(
  "/social-preview-projects/:id",
  requireAdmin,
  zValidator("json", socialPreviewProjectUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");

    const result = await updateManagedSocialPreviewProject(id, c.req.valid("json"));
    if (!result.ok) return fail(c, 404, "Social preview project not found");

    return ok(c, result.project);
  },
);

socialPreviewImageRoutes.delete("/social-preview-projects/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await deleteManagedSocialPreviewProject(id);
  if (!result.ok) return fail(c, 404, "Social preview project not found");

  return ok(c, { message: "Deleted" });
});

socialPreviewImageRoutes.post("/social-preview-assets", requireAdmin, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  const displayName = formData.get("displayName");
  const overwrite = formData.get("overwrite") !== "false";

  const result = await uploadManagedSocialPreviewAsset({
    adminId: c.get("adminId"),
    displayName: typeof displayName === "string" ? displayName : undefined,
    file,
    overwrite,
  });

  if (!result.ok) {
    if (result.reason === "missing_file") return fail(c, 400, "No file provided");
    if (result.reason === "name_conflict") {
      return fail(c, 409, "Media asset name already exists", "MEDIA_NAME_CONFLICT");
    }
    if (result.reason === "too_large") return fail(c, 413, "File too large", "PAYLOAD_TOO_LARGE");
    if (result.reason === "invalid_file") return fail(c, 400, "Unsupported file type");
    return fail(c, 500, "Failed to store file");
  }

  return ok(c, result.asset, 201);
});

socialPreviewImageRoutes.get("/social-preview-images", requireAdmin, async (c) => {
  const images = await listManagedSocialPreviewImages();
  return ok(c, images);
});

socialPreviewImageRoutes.post(
  "/social-preview-images",
  requireAdmin,
  zValidator("json", socialPreviewCreateSchema),
  async (c) => {
    const body = c.req.valid("json");
    const image = await createManagedSocialPreviewImage({
      ...body,
      createdBy: c.get("adminId") ?? null,
    });
    return ok(c, image, 201);
  },
);

socialPreviewImageRoutes.patch(
  "/social-preview-images/:id/active",
  requireAdmin,
  zValidator("json", socialPreviewActiveSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");

    const { active } = c.req.valid("json");
    const result = await setManagedSocialPreviewImageActive(id, active);
    if (!result.ok) return fail(c, 404, "Social preview image not found");

    return ok(c, result.image);
  },
);

socialPreviewImageRoutes.delete("/social-preview-images/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await deleteManagedSocialPreviewImage(id);
  if (!result.ok) return fail(c, 404, "Social preview image not found");

  return ok(c, { message: "Deleted" });
});
