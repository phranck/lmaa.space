import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  reviewSchema,
  submissionEditSchema,
  submissionReviewImportSchema,
  submissionStatusFilterSchema,
} from "@lmaa/contracts";

import { db } from "../../db/index.js";
import { categories } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { mapShopJsonToShopData } from "../../lib/shopjson-mapper.js";
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
  const {
    status,
    adminNote,
    rejectionLongText,
    rejectionToken,
    notificationTemplateId,
    mastodonTemplateId,
  } = c.req.valid("json");
  const adminId = c.get("adminId");

  const result = await reviewAdminSubmission({
    id,
    status,
    adminNote,
    rejectionLongText,
    rejectionToken,
    adminId,
    notificationTemplateId,
    mastodonTemplateId,
  });

  if (!result.ok) {
    if (result.reason === "shop_exists") {
      c.status(409);
      return c.json({
        error: {
          message: `A public shop for this domain already exists: ${result.existingShopName}. Reject this duplicate submission instead of approving it.`,
          code: "DOMAIN_CONFLICT",
          existingShopName: result.existingShopName,
        },
      });
    }
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

function mapShopJsonToSubmissionEditData(
  shopJson: Record<string, unknown>,
  categoryNameToId: Map<string, number>,
): SubmissionEditData {
  const mapped = mapShopJsonToShopData(shopJson, categoryNameToId);
  return {
    shopName: mapped.name,
    shopUrl: mapped.url,
    description: mapped.description,
    region: mapped.region,
    categoryIds: mapped.categoryIds,
    contactEmail: mapped.contactEmail,
    headquarters: mapped.headquarters,
    socialMedia: mapped.socialMedia,
  };
}

// POST /api/admin/submissions/import – import review results
submissionsRoutes.post(
  "/submissions/import",
  zValidator("json", submissionReviewImportSchema),
  async (c) => {
    const entries = c.req.valid("json");

    const allCategories = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories);
    const categoryNameToId = new Map(
      allCategories.map((cat) => [cat.name.trim().toLocaleLowerCase("de-DE"), cat.id] as const),
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of entries) {
      const { submissionId, ...shopJson } = item;

      const submission = await getAdminSubmissionById(submissionId);
      if (!submission || (submission.status !== "pending" && submission.status !== "onhold")) {
        skipped += 1;
        continue;
      }

      try {
        const editData = mapShopJsonToSubmissionEditData(
          shopJson as Record<string, unknown>,
          categoryNameToId,
        );
        await editSubmission(submissionId, editData);
        await setReadyForReview(submissionId, true);
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Submission ${submissionId}: ${message}`);
      }
    }

    return ok(c, { imported, skipped, errors });
  },
);
