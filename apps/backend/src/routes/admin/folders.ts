import { Hono } from "hono";

import { mediaFolderCreateSchema, mediaFolderUpdateSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createFolder,
  deleteFolderCascade,
  getFolderContents,
  updateFolder,
} from "../../services/admin-folders.js";

export const folderRoutes = new Hono<{ Variables: AuthVariables }>();

folderRoutes.get("/media/folder-contents", requireAdmin, async (c) => {
  const raw = c.req.query("folderId");
  if (raw === undefined || raw === "") {
    return ok(c, await getFolderContents(null));
  }

  const folderId = parseId(raw);
  if (!folderId) return fail(c, 400, "Invalid folder id");
  return ok(c, await getFolderContents(folderId));
});

folderRoutes.post("/media/folders", requireAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = mediaFolderCreateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, "Invalid folder payload");

  try {
    const folder = await createFolder({ ...parsed.data, createdBy: c.get("adminId") ?? null });
    return ok(c, folder, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "parent_not_found") {
      return fail(c, 404, "Parent folder not found");
    }
    throw error;
  }
});

folderRoutes.patch("/media/folders/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const body = await c.req.json();
  const parsed = mediaFolderUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, "Invalid folder payload");

  try {
    const folder = await updateFolder({ id, ...parsed.data });
    if (!folder) return fail(c, 404, "Media folder not found");
    return ok(c, folder);
  } catch (error) {
    if (error instanceof Error && error.message === "self_parent") {
      return fail(c, 400, "Folder cannot be its own parent");
    }
    if (error instanceof Error && error.message === "parent_is_descendant") {
      return fail(c, 400, "Folder cannot be moved into its descendant");
    }
    if (error instanceof Error && error.message === "system_folder_locked") {
      return fail(c, 403, "System folder cannot be renamed or moved", "SYSTEM_FOLDER_LOCKED");
    }
    throw error;
  }
});

folderRoutes.delete("/media/folders/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  try {
    const result = await deleteFolderCascade(id);
    return ok(c, result);
  } catch (error) {
    if (error instanceof Error && error.message === "not_found") {
      return fail(c, 404, "Media folder not found");
    }
    if (error instanceof Error && error.message === "system_folder_locked") {
      return fail(c, 403, "System folder cannot be deleted", "SYSTEM_FOLDER_LOCKED");
    }
    throw error;
  }
});
