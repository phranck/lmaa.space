import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { reviewSchema, submissionEditSchema, submissionStatusFilterSchema } from "@lmaa/contracts";
import type { ShopCheckNotes } from "@lmaa/shared";

import { db } from "../../db/index.js";
import { categories } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  type SubmissionEditData,
  editSubmission,
  getAdminSubmissionById,
  listAdminSubmissions,
  setReadyForReview,
} from "../../repositories/admin-submissions.js";
import {
  deleteModeratedAdminSubmission,
  reviewAdminSubmission,
} from "../../services/admin-submissions.js";

/**
 * Admin submission moderation routes.
 *
 * Supports listing, single-item loading, reviewing, editing pending
 * submissions and deleting rejected submissions.
 */
export const submissionsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/submissions
submissionsRoutes.get("/submissions", async (c) => {
  const statusQuery = c.req.query("status");
  const parsedStatus = statusQuery ? submissionStatusFilterSchema.safeParse(statusQuery) : null;
  if (parsedStatus && !parsedStatus.success) {
    return fail(c, 400, "Invalid status filter");
  }

  const status = parsedStatus?.success ? parsedStatus.data : undefined;
  const submissions = await listAdminSubmissions(status);
  return ok(c, submissions);
});

// GET /api/admin/submissions/export – export pending submissions for shopcheck
submissionsRoutes.get("/submissions/export", async (c) => {
  const submissions = await listAdminSubmissions("pending");
  const exportData = submissions.map((s) => ({
    id: s.id,
    name: s.shopName,
    url: s.shopUrl,
  }));
  return ok(c, exportData);
});

// GET /api/admin/submissions/:id
submissionsRoutes.get("/submissions/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const submission = await getAdminSubmissionById(id);
  if (!submission) {
    return fail(c, 404, "Submission not found");
  }

  return ok(c, submission);
});

// PATCH /api/admin/submissions/:id
submissionsRoutes.patch("/submissions/:id", zValidator("json", reviewSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const { status, adminNote, rejectionLongText, rejectionToken } = c.req.valid("json");
  const adminId = c.get("adminId");

  const result = await reviewAdminSubmission({
    id,
    status,
    adminNote,
    rejectionLongText,
    rejectionToken,
    adminId,
  });

  if (!result.ok) {
    return fail(c, 404, "Submission not found");
  }

  return ok(c, result.submission);
});

// PATCH /api/admin/submissions/:id/edit – update pending submission's shop data
submissionsRoutes.patch(
  "/submissions/:id/edit",
  zValidator("json", submissionEditSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");
    const body = c.req.valid("json");

    const submission = await editSubmission(id, body);

    if (!submission) {
      return fail(c, 404, "Submission not found");
    }

    return ok(c, submission);
  },
);

// DELETE /api/admin/submissions/:id – permanently remove rejected or onhold submissions
submissionsRoutes.delete("/submissions/:id", requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const result = await deleteModeratedAdminSubmission(id);
  if (!result.ok && result.reason === "not_found") {
    return fail(c, 404, "Submission not found");
  }
  if (!result.ok && result.reason === "invalid_status") {
    return fail(c, 400, "Only rejected or onhold submissions can be deleted");
  }

  return ok(c, { message: "Submission deleted" });
});

// -- Import helpers ----------------------------------------------------------

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => getString(entry))
    .filter((entry): entry is string => entry !== null);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getShopCheckNotes(value: unknown): ShopCheckNotes | null {
  const notes = getRecord(value);
  if (notes === null) return null;
  const focus = getStringArray(notes.focus);
  const brandsOrProducts = getStringArray(notes.brandsOrProducts);
  const companyPresentation = getString(notes.companyPresentation);
  if (focus.length === 0 && brandsOrProducts.length === 0 && companyPresentation === null) {
    return null;
  }
  return { focus: Array.from(new Set(focus)), brandsOrProducts: Array.from(new Set(brandsOrProducts)), companyPresentation };
}

const REGION_CODES = ["DE", "AT", "CH", "EU", "WORLD"] as const;

async function mapShopJsonToEditData(
  shopJson: Record<string, unknown>,
  categoryNameToId: Map<string, number>,
): Promise<SubmissionEditData> {
  const name = getString(shopJson.name) ?? "";
  const url = getString(shopJson.url) ?? "";
  const description = getString(shopJson.description) ?? "";
  const contactEmail = getString(shopJson.contactEmail) ?? undefined;

  const categoryNames = getStringArray(shopJson.categories);
  const categoryIds = categoryNames
    .map((n) => categoryNameToId.get(n.trim().toLocaleLowerCase("de-DE")) ?? null)
    .filter((id): id is number => id !== null);

  const shippingRegions = getStringArray(shopJson.shippingRegions)
    .map((r) => r.toUpperCase())
    .filter((r): r is (typeof REGION_CODES)[number] =>
      REGION_CODES.includes(r as (typeof REGION_CODES)[number]),
    );

  const socialMediaRaw = getRecord(shopJson.socialMedia);
  const socialMedia: Record<string, string> = {};
  if (socialMediaRaw) {
    for (const [platform, value] of Object.entries(socialMediaRaw)) {
      const normalized = getString(value);
      if (normalized) socialMedia[platform] = normalized;
    }
  }

  const shopCheckNotes = getShopCheckNotes(shopJson.notes) ?? undefined;

  const hqRaw = getRecord(shopJson.headquarters);
  const geoRaw = getRecord(shopJson.geo);
  let headquarters: SubmissionEditData["headquarters"];
  if (hqRaw || geoRaw) {
    headquarters = {
      street: hqRaw ? getString(hqRaw.street) ?? undefined : undefined,
      postalCode: hqRaw ? getString(hqRaw.postalCode) ?? undefined : undefined,
      city: hqRaw ? getString(hqRaw.city) ?? undefined : undefined,
      state: hqRaw ? getString(hqRaw.state) ?? undefined : undefined,
      countryCode: hqRaw ? (getString(hqRaw.countryCode)?.toUpperCase() ?? undefined) : undefined,
      latitude: geoRaw && typeof geoRaw.latitude === "number" ? geoRaw.latitude : undefined,
      longitude: geoRaw && typeof geoRaw.longitude === "number" ? geoRaw.longitude : undefined,
    };
  }

  return {
    shopName: name,
    shopUrl: url,
    description,
    region: Array.from(new Set(shippingRegions)),
    categoryIds: Array.from(new Set(categoryIds)),
    contactEmail,
    headquarters,
    shopCheckNotes,
    socialMedia,
  };
}

const importEntrySchema = z.object({
  shopId: z.number().int().positive(),
  shopName: z.string(),
  shopUrl: z.string(),
  verdict: z.string(),
  shopJson: z.record(z.unknown()).nullable().optional(),
});

const importBodySchema = z.object({
  entries: z.array(importEntrySchema),
});

// POST /api/admin/submissions/import – import shopcheck results
submissionsRoutes.post(
  "/submissions/import",
  zValidator("json", importBodySchema),
  async (c) => {
    const { entries } = c.req.valid("json");

    const allCategories = await db.select({ id: categories.id, name: categories.name }).from(categories);
    const categoryNameToId = new Map(
      allCategories.map((cat) => [cat.name.trim().toLocaleLowerCase("de-DE"), cat.id] as const),
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      if (entry.verdict !== "accept" || !entry.shopJson) {
        skipped += 1;
        continue;
      }

      const submission = await getAdminSubmissionById(entry.shopId);
      if (!submission || (submission.status !== "pending" && submission.status !== "onhold")) {
        skipped += 1;
        continue;
      }

      try {
        const editData = await mapShopJsonToEditData(entry.shopJson, categoryNameToId);
        await editSubmission(entry.shopId, editData);
        await setReadyForReview(entry.shopId, true);
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Submission ${entry.shopId}: ${message}`);
      }
    }

    return ok(c, { imported, skipped, errors });
  },
);
