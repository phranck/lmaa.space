import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDomain } from "tldts";

import type { ShopCheckNotes, SubmissionReviewStatus, SubmissionStatus } from "@lmaa/shared";

import type { HeadquartersInput } from "./headquarters.js";
import {
  copySubmissionHeadquartersToShop,
  loadSubmissionHeadquartersMap,
  upsertSubmissionHeadquarters,
} from "./headquarters.js";
import { db } from "../db/index.js";
import {
  type Shop,
  type Submission,
  categories,
  shopCategories,
  shops,
  submissionCategories,
  submissions,
} from "../db/schema.js";

/**
 * Editable fields for a pending submission.
 */
export interface SubmissionEditData {
  shopName: string;
  shopUrl: string;
  description?: string;
  ogImage?: string | null;
  logoBackgroundColor?: string | null;
  region: string[];
  shipping?: string;
  categoryIds: number[];
  contactEmail?: string;
  shopCheckNotes?: ShopCheckNotes | null;
  headquarters?: HeadquartersInput | null;
  socialMedia?: Record<string, string>;
}

/**
 * Moderation decision payload.
 */
interface SubmissionReviewData {
  id: number;
  status: SubmissionReviewStatus;
  adminNote?: string;
  rejectionLongText?: string;
  rejectionToken?: string;
  adminId: number;
}

/**
 * Result of a review transaction including optional newly created shop.
 *
 * `conflict` is only populated when approving a submission whose registered
 * domain is already claimed by an existing public shop; in that case neither
 * `submission` nor `newShop` is returned and no writes occur.
 */
interface SubmissionReviewResult {
  submission: Submission | null;
  newShop: Pick<Shop, "id" | "url"> | null;
  conflict: { existingShopId: number; existingShopName: string } | null;
}

/**
 * Lists submissions and hydrates their category ids.
 *
 * @param status - Optional status filter.
 * @returns Submissions sorted by creation date (newest first).
 */
export async function listAdminSubmissions(
  status?: SubmissionStatus,
): Promise<Array<Submission & { categoryIds: number[] }>> {
  const query = db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const rows = status ? await query.where(eq(submissions.status, status)) : await query;

  return hydrateSubmissionCategoryIds(rows);
}

/**
 * Loads a single submission and hydrates its category ids.
 *
 * @param id - Submission id.
 * @returns Submission row with category ids or `null` when not found.
 */
export async function getAdminSubmissionById(
  id: number,
): Promise<(Submission & { categoryIds: number[] }) | null> {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));

  if (!submission) {
    return null;
  }

  const [hydrated] = await hydrateSubmissionCategoryIds([submission]);
  return hydrated ?? null;
}

async function hydrateSubmissionCategoryIds(
  rows: Submission[],
): Promise<Array<Submission & { categoryIds: number[] }>> {
  if (rows.length === 0) {
    return [];
  }

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

  const headquartersMap = await loadSubmissionHeadquartersMap(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    categoryIds: categoryMap.get(row.id) ?? [],
    headquarters: headquartersMap.get(row.id) ?? null,
  }));
}

/**
 * Returns category names linked to one submission.
 */
export async function getSubmissionCategoryNames(id: number): Promise<string[]> {
  const rows = await db
    .select({ name: categories.name })
    .from(submissionCategories)
    .innerJoin(categories, eq(categories.id, submissionCategories.categoryId))
    .where(eq(submissionCategories.submissionId, id))
    .orderBy(asc(categories.name));

  return rows.map((row) => row.name);
}

/**
 * Applies a moderation decision to a submission.
 *
 * Hidden behavior: approving a submission creates a shop and copies category
 * links inside the same transaction.
 *
 * @param data - Review payload containing status and actor id.
 * @returns Updated submission and optional created shop reference.
 */
export async function reviewSubmission(
  data: SubmissionReviewData,
): Promise<SubmissionReviewResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: submissions.status, shopUrl: submissions.shopUrl })
      .from(submissions)
      .where(eq(submissions.id, data.id));

    if (!current) {
      return { submission: null, newShop: null, conflict: null };
    }

    if (current.status === "approved" || current.status === "rejected") {
      return { submission: null, newShop: null, conflict: null };
    }

    if (data.status === "approved") {
      const domain = getDomain(current.shopUrl);
      if (domain) {
        const existingRows = await tx.execute<{ id: number; name: string; url: string }>(sql`
          SELECT id, name, url FROM shops
          WHERE url LIKE ${"%" + domain + "%"}
            AND visibility = 'public'
          LIMIT 10
        `);
        const conflict = existingRows.find((row) => getDomain(row.url) === domain);
        if (conflict) {
          return {
            submission: null,
            newShop: null,
            conflict: { existingShopId: conflict.id, existingShopName: conflict.name },
          };
        }
      }
    }

    const [submission] = await tx
      .update(submissions)
      .set({
        status: data.status,
        adminNote: data.adminNote ?? null,
        rejectionLongText: data.status === "rejected" ? (data.rejectionLongText ?? null) : null,
        rejectionToken: data.status === "rejected" ? (data.rejectionToken ?? null) : null,
        readyForReview: false,
        reviewedBy: data.adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, data.id))
      .returning();

    if (!submission) {
      return { submission: null, newShop: null, conflict: null };
    }

    if (data.status !== "approved") {
      return { submission, newShop: null, conflict: null };
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
        ogImage: submission.ogImage,
        logoBackgroundColor: submission.logoBackgroundColor,
        contactEmail: submission.contactEmail,
        shopCheckNotes: submission.shopCheckNotes,
        socialMedia: submission.socialMedia,
      })
      .returning({ id: shops.id, url: shops.url });

    if (categoryRows.length > 0) {
      await tx
        .insert(shopCategories)
        .values(categoryRows.map((row) => ({ shopId: shop.id, categoryId: row.categoryId })));
    }

    await copySubmissionHeadquartersToShop(tx, submission.id, shop.id);

    return { submission, newShop: shop, conflict: null };
  });
}

/**
 * Updates data for a pending submission.
 *
 * Hidden behavior: category links are fully replaced.
 *
 * @param id - Submission id.
 * @param data - New submission values.
 * @returns Updated submission row or `null` when not found.
 */
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
        ...(data.ogImage !== undefined ? { ogImage: data.ogImage } : {}),
        ...(data.logoBackgroundColor !== undefined
          ? { logoBackgroundColor: data.logoBackgroundColor }
          : {}),
        region: data.region,
        shipping: data.shipping ?? "",
        contactEmail: data.contactEmail || null,
        ...(data.shopCheckNotes !== undefined ? { shopCheckNotes: data.shopCheckNotes } : {}),
        socialMedia: data.socialMedia ?? {},
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

    if (data.headquarters !== undefined) {
      await upsertSubmissionHeadquarters(tx, id, data.headquarters);
    }

    return submission;
  });
}

/**
 * Reads the moderation status of a submission.
 *
 * @param id - Submission id.
 * @returns Status value or `null` when not found.
 */
export async function getSubmissionStatus(id: number): Promise<SubmissionStatus | null> {
  const [submission] = await db
    .select({ status: submissions.status })
    .from(submissions)
    .where(eq(submissions.id, id));

  return submission?.status ?? null;
}

/**
 * Permanently deletes a submission.
 *
 * @param id - Submission id.
 * @returns Resolves when delete is finished.
 */
export async function deleteSubmission(id: number): Promise<void> {
  await db.delete(submissions).where(eq(submissions.id, id));
}

/**
 * Creates a new submission row from raw form data.
 *
 * Field values are read by variable name from `data`. Missing fields fall back
 * to sensible empty defaults so the row is always valid.
 *
 * @param data - Submitted field values keyed by variable name.
 * @returns The id of the created submission row.
 */
export async function setReadyForReview(id: number, value: boolean): Promise<void> {
  await db
    .update(submissions)
    .set({ readyForReview: value, updatedAt: new Date() })
    .where(eq(submissions.id, id));
}

export async function createSubmissionFromFormData(data: Record<string, unknown>): Promise<number> {
  const str = (key: string) => (data[key] != null ? String(data[key]) : "");
  const strOrNull = (key: string) => (data[key] != null ? String(data[key]) : null);
  const region = Array.isArray(data.region) ? (data.region as string[]) : [];
  const categoryIds = Array.isArray(data.submissionCategories)
    ? (data.submissionCategories as unknown[]).map(Number).filter((n) => !Number.isNaN(n))
    : [];

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(submissions)
      .values({
        shopName: str("shopName"),
        shopUrl: str("shopUrl"),
        region,
        pickup: str("pickup"),
        shipping: str("shipping"),
        description: str("description"),
        contactEmail: strOrNull("contactEmail"),
        submitterEmail: strOrNull("submitterEmail"),
        submitterNote: strOrNull("submitterNote"),
      })
      .returning({ id: submissions.id });

    if (categoryIds.length > 0) {
      await tx
        .insert(submissionCategories)
        .values(categoryIds.map((categoryId) => ({ submissionId: row.id, categoryId })));
    }

    return row.id;
  });
}
