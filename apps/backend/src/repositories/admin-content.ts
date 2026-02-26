import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminUsers, contentPages } from "../db/schema.js";

export type ContentPageStatus = "draft" | "published" | "hidden";

export interface ContentPageSummaryRow {
  slug: string;
  title: string;
  status: ContentPageStatus;
  createdAt: Date;
  createdBy: number | null;
  updatedAt: Date | null;
  updatedBy: number | null;
}

export interface ContentPageDetailRow extends ContentPageSummaryRow {
  content: string;
}

export async function listContentPageSummaries(): Promise<ContentPageSummaryRow[]> {
  return db
    .select({
      slug: contentPages.slug,
      title: contentPages.title,
      status: contentPages.status,
      createdAt: contentPages.createdAt,
      createdBy: contentPages.createdBy,
      updatedAt: contentPages.updatedAt,
      updatedBy: contentPages.updatedBy,
    })
    .from(contentPages)
    .orderBy(contentPages.title);
}

export async function getContentPageBySlug(slug: string): Promise<ContentPageDetailRow | null> {
  const [page] = await db
    .select({
      slug: contentPages.slug,
      title: contentPages.title,
      content: contentPages.content,
      status: contentPages.status,
      createdAt: contentPages.createdAt,
      createdBy: contentPages.createdBy,
      updatedAt: contentPages.updatedAt,
      updatedBy: contentPages.updatedBy,
    })
    .from(contentPages)
    .where(eq(contentPages.slug, slug))
    .limit(1);

  return page ?? null;
}

export async function contentPageSlugExists(slug: string): Promise<boolean> {
  const [page] = await db
    .select({ slug: contentPages.slug })
    .from(contentPages)
    .where(eq(contentPages.slug, slug))
    .limit(1);

  return Boolean(page);
}

export async function createContentPage(data: {
  slug: string;
  title: string;
  status: ContentPageStatus;
  createdBy: number;
}): Promise<ContentPageSummaryRow> {
  const [page] = await db
    .insert(contentPages)
    .values({
      slug: data.slug,
      title: data.title,
      content: "",
      status: data.status,
      createdBy: data.createdBy,
    })
    .returning({
      slug: contentPages.slug,
      title: contentPages.title,
      status: contentPages.status,
      createdAt: contentPages.createdAt,
      createdBy: contentPages.createdBy,
      updatedAt: contentPages.updatedAt,
      updatedBy: contentPages.updatedBy,
    });

  return page;
}

export async function updateContentPageBody(
  slug: string,
  content: string,
  updatedBy: number,
): Promise<ContentPageSummaryRow | null> {
  const [page] = await db
    .update(contentPages)
    .set({ content, updatedAt: new Date(), updatedBy })
    .where(eq(contentPages.slug, slug))
    .returning({
      slug: contentPages.slug,
      title: contentPages.title,
      status: contentPages.status,
      createdAt: contentPages.createdAt,
      createdBy: contentPages.createdBy,
      updatedAt: contentPages.updatedAt,
      updatedBy: contentPages.updatedBy,
    });

  return page ?? null;
}

export async function updateContentPageMeta(
  currentSlug: string,
  updates: Partial<{ title: string; slug: string; status: ContentPageStatus }>,
  updatedBy: number,
): Promise<ContentPageSummaryRow | null> {
  const [page] = await db
    .update(contentPages)
    .set({ ...updates, updatedAt: new Date(), updatedBy })
    .where(eq(contentPages.slug, currentSlug))
    .returning({
      slug: contentPages.slug,
      title: contentPages.title,
      status: contentPages.status,
      createdAt: contentPages.createdAt,
      createdBy: contentPages.createdBy,
      updatedAt: contentPages.updatedAt,
      updatedBy: contentPages.updatedBy,
    });

  return page ?? null;
}

export async function deleteContentPage(slug: string): Promise<boolean> {
  const [deleted] = await db
    .delete(contentPages)
    .where(eq(contentPages.slug, slug))
    .returning({ slug: contentPages.slug });

  return Boolean(deleted);
}

export async function getAdminUsernamesByIds(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) {
    return new Map();
  }

  const users = await db
    .select({ id: adminUsers.id, username: adminUsers.username })
    .from(adminUsers);

  return new Map(users.map((user) => [user.id, user.username]));
}

export async function getAdminUsernameById(id: number): Promise<string | null> {
  const [user] = await db
    .select({ username: adminUsers.username })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return user?.username ?? null;
}
