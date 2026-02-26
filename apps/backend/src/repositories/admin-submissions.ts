import type { SubmissionReviewStatus, SubmissionStatus } from "@lmaa/shared";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  type Shop,
  type Submission,
  shopCategories,
  shops,
  submissionCategories,
  submissions,
} from "../db/schema.js";

export interface SubmissionEditData {
  shopName: string;
  shopUrl: string;
  description?: string;
  region: string[];
  shipping?: string;
  categoryIds: number[];
}

export interface SubmissionReviewData {
  id: number;
  status: SubmissionReviewStatus;
  adminNote?: string;
  adminId: number;
}

export interface SubmissionReviewResult {
  submission: Submission | null;
  newShop: Pick<Shop, "id" | "url"> | null;
}

export async function listAdminSubmissions(
  status?: SubmissionStatus,
): Promise<Array<Submission & { categoryIds: number[] }>> {
  const query = db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const rows = status ? await query.where(eq(submissions.status, status)) : await query;

  const submissionIds = rows.map((submission) => submission.id);
  const categoryRows =
    submissionIds.length > 0
      ? await db
          .select()
          .from(submissionCategories)
          .where(inArray(submissionCategories.submissionId, submissionIds))
      : [];

  const categoryMap = new Map<number, number[]>();
  for (const row of categoryRows) {
    const ids = categoryMap.get(row.submissionId) ?? [];
    ids.push(row.categoryId);
    categoryMap.set(row.submissionId, ids);
  }

  return rows.map((row) => ({ ...row, categoryIds: categoryMap.get(row.id) ?? [] }));
}

export async function reviewSubmission(
  data: SubmissionReviewData,
): Promise<SubmissionReviewResult> {
  return db.transaction(async (tx) => {
    const [submission] = await tx
      .update(submissions)
      .set({
        status: data.status,
        adminNote: data.adminNote ?? null,
        reviewedBy: data.adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, data.id))
      .returning();

    if (!submission) {
      return { submission: null, newShop: null };
    }

    if (data.status !== "approved") {
      return { submission, newShop: null };
    }

    const categoryRows = await tx
      .select({ categoryId: submissionCategories.categoryId })
      .from(submissionCategories)
      .where(eq(submissionCategories.submissionId, data.id));

    const [shop] = await tx
      .insert(shops)
      .values({
        name: submission.shopName,
        url: submission.shopUrl,
        region: submission.region,
        pickup: submission.pickup,
        shipping: submission.shipping,
        description: submission.description,
      })
      .returning({ id: shops.id, url: shops.url });

    if (categoryRows.length > 0) {
      await tx
        .insert(shopCategories)
        .values(categoryRows.map((row) => ({ shopId: shop.id, categoryId: row.categoryId })));
    }

    return { submission, newShop: shop };
  });
}

export async function editSubmission(
  id: number,
  data: SubmissionEditData,
): Promise<Submission | null> {
  return db.transaction(async (tx) => {
    const [submission] = await tx
      .update(submissions)
      .set({
        shopName: data.shopName,
        shopUrl: data.shopUrl,
        description: data.description ?? "",
        region: data.region,
        shipping: data.shipping ?? "",
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, id))
      .returning();

    if (!submission) {
      return null;
    }

    await tx.delete(submissionCategories).where(eq(submissionCategories.submissionId, id));

    if (data.categoryIds.length > 0) {
      await tx
        .insert(submissionCategories)
        .values(data.categoryIds.map((categoryId) => ({ submissionId: id, categoryId })));
    }

    return submission;
  });
}

export async function getSubmissionStatus(id: number): Promise<SubmissionStatus | null> {
  const [submission] = await db
    .select({ status: submissions.status })
    .from(submissions)
    .where(eq(submissions.id, id));

  return submission?.status ?? null;
}

export async function deleteSubmission(id: number): Promise<void> {
  await db.delete(submissions).where(eq(submissions.id, id));
}

export async function setSubmissionFeedbackSent(id: number): Promise<void> {
  await db.update(submissions).set({ feedbackSent: true }).where(eq(submissions.id, id));
}

export async function setShopOgImage(id: number, ogImage: string): Promise<void> {
  await db.update(shops).set({ ogImage }).where(eq(shops.id, id));
}
