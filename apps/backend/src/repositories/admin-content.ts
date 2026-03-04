import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminUsers, contentPages } from "../db/schema.js";

/**
 * Internal storage status of CMS-like content pages.
 */
type ContentPageStatus = "draft" | "published" | "hidden";

/**
 * Lightweight content page projection used for listings.
 */
interface ContentPageSummaryRow {
  slug: string;
  title: string;
  status: ContentPageStatus;
  showTitle: boolean;
  createdAt: Date;
  createdBy: number | null;
  updatedAt: Date | null;
  updatedBy: number | null;
}

/**
 * Full page projection including Markdown body.
 */
interface ContentPageDetailRow extends ContentPageSummaryRow {
  content: string;
}

/** Shared select projection matching `ContentPageSummaryRow`. */
const CONTENT_PAGE_SUMMARY_FIELDS = {
  slug: contentPages.slug,
  title: contentPages.title,
  status: contentPages.status,
  showTitle: contentPages.showTitle,
  createdAt: contentPages.createdAt,
  createdBy: contentPages.createdBy,
  updatedAt: contentPages.updatedAt,
  updatedBy: contentPages.updatedBy,
};

/**
 * Returns all content pages without loading the full body text.
 *
 * @returns Summaries ordered by title.
 */
export async function listContentPageSummaries(): Promise<ContentPageSummaryRow[]> {
  return db.select(CONTENT_PAGE_SUMMARY_FIELDS).from(contentPages).orderBy(contentPages.title);
}

/**
 * Loads one content page by slug including body text.
 *
 * @param slug - Stable page slug.
 * @returns Matching page row or `null` when not found.
 */
export async function getContentPageBySlug(slug: string): Promise<ContentPageDetailRow | null> {
  const [page] = await db
    .select({
      ...CONTENT_PAGE_SUMMARY_FIELDS,
      content: contentPages.content,
    })
    .from(contentPages)
    .where(eq(contentPages.slug, slug))
    .limit(1);

  return page ?? null;
}

/**
 * Checks if a slug is already used by another content page.
 *
 * @param slug - Candidate slug.
 * @returns `true` when a row with this slug exists.
 */
export async function contentPageSlugExists(slug: string): Promise<boolean> {
  const [page] = await db
    .select({ slug: contentPages.slug })
    .from(contentPages)
    .where(eq(contentPages.slug, slug))
    .limit(1);

  return Boolean(page);
}

/**
 * Creates a new page with empty body content.
 *
 * Hidden behavior: `content` is initialized with an empty string so editors can
 * patch body content separately.
 *
 * @param data - Initial metadata and creator id.
 * @returns Stored page summary.
 */
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
    .returning(CONTENT_PAGE_SUMMARY_FIELDS);

  return page;
}

/**
 * Replaces the body of a page and records updater metadata.
 *
 * @param slug - Page slug to update.
 * @param content - New Markdown source.
 * @param updatedBy - Admin id performing the write.
 * @returns Updated summary or `null` when slug was not found.
 */
export async function updateContentPageBody(
  slug: string,
  content: string,
  updatedBy: number,
): Promise<ContentPageSummaryRow | null> {
  const [page] = await db
    .update(contentPages)
    .set({ content, updatedAt: new Date(), updatedBy })
    .where(eq(contentPages.slug, slug))
    .returning(CONTENT_PAGE_SUMMARY_FIELDS);

  return page ?? null;
}

/**
 * Updates metadata fields (title/slug/status) for a page.
 *
 * @param currentSlug - Existing slug used as lookup key.
 * @param updates - Partial metadata patch.
 * @param updatedBy - Admin id performing the update.
 * @returns Updated summary or `null` when the source slug does not exist.
 */
export async function updateContentPageMeta(
  currentSlug: string,
  updates: Partial<{ title: string; slug: string; status: ContentPageStatus; showTitle: boolean }>,
  updatedBy: number,
): Promise<ContentPageSummaryRow | null> {
  const [page] = await db
    .update(contentPages)
    .set({ ...updates, updatedAt: new Date(), updatedBy })
    .where(eq(contentPages.slug, currentSlug))
    .returning(CONTENT_PAGE_SUMMARY_FIELDS);

  return page ?? null;
}

/**
 * Deletes a content page by slug.
 *
 * @param slug - Slug to delete.
 * @returns `true` when a row was removed.
 */
export async function deleteContentPage(slug: string): Promise<boolean> {
  const [deleted] = await db
    .delete(contentPages)
    .where(eq(contentPages.slug, slug))
    .returning({ slug: contentPages.slug });

  return Boolean(deleted);
}

/**
 * Maps admin ids to usernames.
 *
 * @param ids - Admin ids that should be resolved.
 * @returns Map keyed by admin id.
 */
export async function getAdminUsernamesByIds(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) {
    return new Map();
  }

  const users = await db
    .select({ id: adminUsers.id, username: adminUsers.username })
    .from(adminUsers)
    .where(inArray(adminUsers.id, ids));

  return new Map(users.map((user) => [user.id, user.username]));
}

/**
 * Resolves a single admin username.
 *
 * @param id - Admin user id.
 * @returns Username string or `null` when not found.
 */
export async function getAdminUsernameById(id: number): Promise<string | null> {
  const [user] = await db
    .select({ username: adminUsers.username })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return user?.username ?? null;
}
