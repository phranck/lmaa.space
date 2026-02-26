import { zValidator } from "@hono/zod-validator";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index.js";
import { shopCategories, shops, submissionCategories, submissions } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { fetchPreviewImage } from "../../lib/og.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";
import { sendSubmissionApproved, sendSubmissionRejected } from "../../services/email.js";

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected", "onhold"]),
  adminNote: z.string().max(500).optional(),
  sendFeedback: z.boolean().optional(),
});

const submissionEditSchema = z.object({
  shopName: z.string().min(1).max(200),
  shopUrl: z.string().url(),
  description: z.string().max(2000).optional(),
  region: z
    .array(z.enum(["DE", "AT", "CH", "EU"]))
    .optional()
    .default([]),
  shipping: z.string().max(200).optional(),
  categoryIds: z.array(z.number().int().positive()),
});

export const submissionsRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/submissions
submissionsRoutes.get("/submissions", requireAuth, async (c) => {
  const status = c.req.query("status") as
    | "pending"
    | "onhold"
    | "approved"
    | "rejected"
    | undefined;

  const query = db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const rows = status ? await query.where(eq(submissions.status, status)) : await query;

  const subIds = rows.map((s) => s.id);
  const catRows =
    subIds.length > 0
      ? await db
          .select()
          .from(submissionCategories)
          .where(inArray(submissionCategories.submissionId, subIds))
      : [];

  const catMap = new Map<number, number[]>();
  for (const r of catRows) {
    const arr = catMap.get(r.submissionId) ?? [];
    arr.push(r.categoryId);
    catMap.set(r.submissionId, arr);
  }

  const mapped = rows.map((row) => ({ ...row, categoryIds: catMap.get(row.id) ?? [] }));
  return ok(c, mapped);
});

// PATCH /api/admin/submissions/:id
submissionsRoutes.patch(
  "/submissions/:id",
  requireAuth,
  zValidator("json", reviewSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");
    const { status, adminNote, sendFeedback } = c.req.valid("json");
    const adminId = c.get("adminId");

    const { submission, newShop } = await db.transaction(async (tx) => {
      const [sub] = await tx
        .update(submissions)
        .set({
          status,
          adminNote: adminNote ?? null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, id))
        .returning();

      if (!sub) return { submission: null, newShop: null };

      let created = null;
      if (status === "approved") {
        const catRows = await tx
          .select({ categoryId: submissionCategories.categoryId })
          .from(submissionCategories)
          .where(eq(submissionCategories.submissionId, id));

        const [shop] = await tx
          .insert(shops)
          .values({
            name: sub.shopName,
            url: sub.shopUrl,
            region: sub.region,
            pickup: sub.pickup,
            shipping: sub.shipping,
            description: sub.description,
          })
          .returning();

        if (catRows.length > 0) {
          await tx
            .insert(shopCategories)
            .values(catRows.map((r) => ({ shopId: shop.id, categoryId: r.categoryId })));
        }
        created = shop;
      }

      return { submission: sub, newShop: created };
    });

    if (!submission) {
      return fail(c, 404, "Submission not found");
    }

    // Side effects outside transaction
    if (newShop) {
      fetchPreviewImage(newShop.url)
        .then(async (result) => {
          if (result) {
            await db.update(shops).set({ ogImage: result.url }).where(eq(shops.id, newShop.id));
          }
        })
        .catch(() => {});
    }

    if (sendFeedback && submission.submitterEmail) {
      try {
        if (status === "approved") {
          await sendSubmissionApproved(submission.submitterEmail, submission.shopName);
        } else {
          await sendSubmissionRejected(submission.submitterEmail, submission.shopName, adminNote);
        }
        await db.update(submissions).set({ feedbackSent: true }).where(eq(submissions.id, id));
      } catch (err) {
        console.error("[email] Failed to send feedback:", err);
      }
    }

    return ok(c, submission);
  },
);

// PATCH /api/admin/submissions/:id/edit – update pending submission's shop data
submissionsRoutes.patch(
  "/submissions/:id/edit",
  requireAuth,
  zValidator("json", submissionEditSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid id");
    const body = c.req.valid("json");

    const submission = await db.transaction(async (tx) => {
      const [sub] = await tx
        .update(submissions)
        .set({
          shopName: body.shopName,
          shopUrl: body.shopUrl,
          description: body.description ?? "",
          region: body.region ?? [],
          shipping: body.shipping ?? "",
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, id))
        .returning();

      if (!sub) return null;

      await tx.delete(submissionCategories).where(eq(submissionCategories.submissionId, id));

      if (body.categoryIds.length > 0) {
        await tx
          .insert(submissionCategories)
          .values(body.categoryIds.map((cid) => ({ submissionId: id, categoryId: cid })));
      }

      return sub;
    });

    if (!submission) {
      return fail(c, 404, "Submission not found");
    }

    return ok(c, submission);
  },
);

// DELETE /api/admin/submissions/:id – permanently remove rejected submissions
submissionsRoutes.delete("/submissions/:id", requireAuth, requireAdmin, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");

  const [entry] = await db
    .select({ id: submissions.id, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.id, id));

  if (!entry) return fail(c, 404, "Submission not found");
  if (entry.status !== "rejected") {
    return fail(c, 400, "Only rejected submissions can be deleted");
  }

  await db.delete(submissions).where(eq(submissions.id, id));
  return ok(c, { message: "Submission deleted" });
});
