import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  deleteReasonUpdateSchema,
  ogImageUpdateSchema,
  previewImageSchema,
  shopBodySchema,
  shopDeleteBodySchema,
  shopUpdateSchema,
  shopcheckImportSchema,
  visibilityFilterSchema,
  visibilityUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  getAdminShopById,
  getShopVisibilityCounts,
  listAdminShops,
} from "../../repositories/admin-shops.js";
import {
  acceptShopReview,
  changeManagedAdminShopVisibility,
  createManagedAdminShop,
  deleteManagedAdminShop,
  previewAdminShopImage,
  refetchAdminShopImage,
  setManagedAdminShopOgImage,
  stageShopReviewData,
  updateManagedAdminShop,
  updateManagedAdminShopDeleteReason,
} from "../../services/admin-shops.js";

/**
 * Admin shop management routes (CRUD, visibility, image helpers).
 */
export const shopsRoutes = new Hono<{ Variables: AuthVariables }>();

shopsRoutes.get("/shops", async (c) => {
  const visibilityFilter = c.req.query("visibility");
  const parsedVisibility = visibilityFilter
    ? visibilityFilterSchema.safeParse(visibilityFilter)
    : null;

  if (parsedVisibility && !parsedVisibility.success) {
    return fail(c, 400, "Invalid visibility filter");
  }

  const visibilityValue = parsedVisibility?.success ? parsedVisibility.data : undefined;
  const rows = await listAdminShops(visibilityValue);
  return ok(c, rows);
});

shopsRoutes.get("/shops/counts", async (c) => {
  const counts = await getShopVisibilityCounts();
  return ok(c, counts);
});

shopsRoutes.get("/shops/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const row = await getAdminShopById(id);
  if (!row) return fail(c, 404, "Shop not found");
  return ok(c, row);
});

shopsRoutes.post("/shops", requireAdmin, zValidator("json", shopBodySchema), async (c) => {
  const body = c.req.valid("json");
  const result = await createManagedAdminShop(body);
  if (!result.ok) {
    c.status(409);
    return c.json({
      error: {
        message: "A shop or submission for this domain already exists.",
        code: "DOMAIN_CONFLICT",
        conflictStatus: result.conflictStatus,
        conflictShopName: result.conflictShopName,
      },
    });
  }
  return ok(c, result.shop, 201);
});

const updateShopHandler = zValidator("json", shopUpdateSchema);

shopsRoutes.put("/shops/:id", requireAdmin, updateShopHandler, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const body = c.req.valid("json");
  const result = await updateManagedAdminShop(id, body);
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, result.shop);
});

shopsRoutes.patch("/shops/:id", requireAdmin, updateShopHandler, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const body = c.req.valid("json");
  const result = await updateManagedAdminShop(id, body);
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, result.shop);
});

shopsRoutes.delete(
  "/shops/:id",
  requireAdmin,
  zValidator("json", shopDeleteBodySchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");

    const { reason, wasReported, mode } = c.req.valid("json");

    const result = await deleteManagedAdminShop(id, {
      mode,
      reason: reason?.trim() || null,
      wasReported,
      adminId: c.get("adminId") ?? null,
    });
    if (!result.ok) return fail(c, 404, "Shop not found");
    return ok(c, { message: result.message });
  },
);

// PATCH /admin/shops/:id/visibility — set public, onhold or rejected (use DELETE for deleted)
shopsRoutes.patch("/shops/:id/visibility", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const parsedBody = visibilityUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return fail(c, 400, "Use 'public', 'onhold' or 'rejected'; for deleting use DELETE");
  }
  const { visibility, rejectionToken, rejectionAdminNote, rejectionLongText } = parsedBody.data;

  const result = await changeManagedAdminShopVisibility(id, visibility, {
    rejectionToken,
    rejectionAdminNote,
    rejectionLongText,
  });
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, { message: result.message });
});

// PATCH /admin/shops/:id/delete-reason — update reason text for a soft-deleted shop
shopsRoutes.patch("/shops/:id/delete-reason", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const parsedBody = deleteReasonUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsedBody.success) return fail(c, 400, "Invalid body");

  const result = await updateManagedAdminShopDeleteReason(id, parsedBody.data.reason);
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, { message: "Delete reason updated" });
});

shopsRoutes.post("/shops/:id/refetch-image", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await refetchAdminShopImage(id);
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, { ogImage: result.ogImage });
});

// PATCH /admin/shops/:id/og-image — manually set the OG image URL
shopsRoutes.patch(
  "/shops/:id/og-image",
  requireAdmin,
  zValidator("json", ogImageUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");
    const { ogImage } = c.req.valid("json");
    await setManagedAdminShopOgImage(id, ogImage);
    return ok(c, { ogImage });
  },
);

shopsRoutes.post(
  "/preview-image",
  requireAdmin,
  zValidator("json", previewImageSchema),
  async (c) => {
    const { url } = c.req.valid("json");
    const result = await previewAdminShopImage(url);
    return ok(c, result);
  },
);

// POST /admin/shops/import — stage review JSON (flat array of shopJson) for review
shopsRoutes.post(
  "/shops/import",
  requireAdmin,
  zValidator("json", shopcheckImportSchema),
  async (c) => {
    const entries = c.req.valid("json");

    const results = await Promise.all(
      entries.map(async (item) => {
        const { shopId, ...shopJson } = item;

        try {
          const result = await stageShopReviewData(shopId, shopJson as Record<string, unknown>);
          return result.ok
            ? ({ imported: 1, skipped: 0, error: null } as const)
            : ({ imported: 0, skipped: 1, error: null } as const);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { imported: 0, skipped: 0, error: `Shop ${shopId}: ${message}` } as const;
        }
      }),
    );

    const imported = results.reduce((sum, result) => sum + result.imported, 0);
    const skipped = results.reduce((sum, result) => sum + result.skipped, 0);
    const errors = results.flatMap((result) => (result.error ? [result.error] : []));

    return ok(c, { imported, skipped, errors });
  },
);

// POST /admin/shops/:id/accept-review — apply staged reviewData to live fields
shopsRoutes.post("/shops/:id/accept-review", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const result = await acceptShopReview(id);
  if (!result.ok) {
    if (result.reason === "no_review_data") return fail(c, 400, "No pending review data");
    return fail(c, 404, "Shop not found");
  }
  return ok(c, result.shop);
});
