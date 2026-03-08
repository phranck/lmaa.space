import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { reviewSchema, submissionEditSchema, submissionStatusFilterSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  editSubmission,
  getAdminSubmissionById,
  listAdminSubmissions,
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
