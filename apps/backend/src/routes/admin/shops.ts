import { zValidator } from "@hono/zod-validator";
import {
  previewImageSchema,
  shopBodySchema,
  shopUpdateSchema,
  visibilityFilterSchema,
  visibilityUpdateSchema,
} from "@lmaa/contracts";
import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";
import {
  changeManagedAdminShopVisibility,
  createManagedAdminShop,
  deleteManagedAdminShop,
  getAdminShop,
  getAdminShops,
  previewAdminShopImage,
  refetchAdminShopImage,
  updateManagedAdminShop,
} from "../../services/admin-shops.js";

export const shopsRoutes = new Hono<{ Variables: AuthVariables }>();

shopsRoutes.get("/shops", requireAuth, async (c) => {
  const visibilityFilter = c.req.query("visibility");
  const parsedVisibility = visibilityFilter
    ? visibilityFilterSchema.safeParse(visibilityFilter)
    : null;

  if (parsedVisibility && !parsedVisibility.success) {
    return fail(c, 400, "Invalid visibility filter");
  }

  const visibilityValue = parsedVisibility?.success ? parsedVisibility.data : undefined;
  const rows = await getAdminShops(visibilityValue);
  return ok(c, rows);
});

shopsRoutes.get("/shops/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const row = await getAdminShop(id);
  if (!row) return fail(c, 404, "Shop not found");
  return ok(c, row);
});

shopsRoutes.post("/shops", requireAuth, zValidator("json", shopBodySchema), async (c) => {
  const body = c.req.valid("json");
  const shop = await createManagedAdminShop(body);
  return ok(c, shop, 201);
});

for (const method of ["put", "patch"] as const) {
  shopsRoutes[method](
    "/shops/:id",
    requireAuth,
    zValidator("json", shopUpdateSchema),
    async (c) => {
      const id = parseId(c.req.param("id"));
      if (!id) return fail(c, 400, "Invalid id");
      const body = c.req.valid("json");
      const shop = await updateManagedAdminShop(id, body);

      if (!shop) return fail(c, 404, "Shop not found");
      return ok(c, shop);
    },
  );
}

shopsRoutes.delete("/shops/:id", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const body = await c.req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() || null : null;
  const wasReported = typeof body?.wasReported === "boolean" ? body.wasReported : false;
  const mode = body?.mode === "delete" ? "delete" : "mark_deleted";

  const result = await deleteManagedAdminShop(id, {
    mode,
    reason,
    wasReported,
    adminId: c.get("adminId") ?? null,
  });
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, { message: result.message });
});

// PATCH /admin/shops/:id/visibility — set public or onhold (use DELETE for deleted)
shopsRoutes.patch("/shops/:id/visibility", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const parsedBody = visibilityUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return fail(c, 400, "Use 'public' or 'onhold'; for deleting use DELETE");
  }
  const { visibility } = parsedBody.data;

  const result = await changeManagedAdminShopVisibility(id, visibility);
  return ok(c, result);
});

shopsRoutes.post("/shops/:id/refetch-image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await refetchAdminShopImage(id);
  if (!result.ok) return fail(c, 404, "Shop not found");
  return ok(c, { ogImage: result.ogImage });
});

shopsRoutes.post(
  "/preview-image",
  requireAuth,
  zValidator("json", previewImageSchema),
  async (c) => {
    const { url } = c.req.valid("json");
    const result = await previewAdminShopImage(url);
    return ok(c, result);
  },
);
