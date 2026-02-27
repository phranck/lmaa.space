import type { ContentPage, ContentPageSummary, ContentStatus } from "@lmaa/shared";
import {
  contentPageSlugExists,
  createContentPage,
  deleteContentPage,
  getAdminUsernameById,
  getAdminUsernamesByIds,
  getContentPageBySlug,
  listContentPageSummaries,
  updateContentPageBody,
  updateContentPageMeta,
} from "../repositories/admin-content.js";

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapSummary(
  row: {
    slug: string;
    title: string;
    status: ContentStatus;
    createdAt: Date;
    createdBy: number | null;
    updatedAt: Date | null;
    updatedBy: number | null;
  },
  usernames: Map<number, string>,
): ContentPageSummary {
  return {
    slug: row.slug,
    title: row.title,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    createdByUsername: row.createdBy ? (usernames.get(row.createdBy) ?? null) : null,
    updatedAt: toIso(row.updatedAt),
    updatedByUsername: row.updatedBy ? (usernames.get(row.updatedBy) ?? null) : null,
  };
}

/**
 * Returns all content page summaries enriched with creator/editor usernames.
 *
 * @returns Summary list for admin content overview tables.
 */
export async function getManagedContentPages(): Promise<ContentPageSummary[]> {
  const pages = await listContentPageSummaries();
  const ids = [
    ...new Set(
      pages
        .flatMap((page) => [page.createdBy, page.updatedBy])
        .filter((id): id is number => id != null),
    ),
  ];
  const usernames = await getAdminUsernamesByIds(ids);
  return pages.map((page) => mapSummary(page, usernames));
}

/**
 * Creates a new content page after slug conflict check.
 *
 * @param input - Page creation payload.
 * @returns
 * - `{ ok: false, reason: "slug_conflict" }` if slug already exists.
 * - `{ ok: true, page }` with normalized summary payload.
 */
export async function createManagedContentPage(input: {
  slug: string;
  title: string;
  status?: ContentStatus;
  adminId: number;
}) {
  const exists = await contentPageSlugExists(input.slug);
  if (exists) {
    return { ok: false as const, reason: "slug_conflict" as const };
  }

  const page = await createContentPage({
    slug: input.slug,
    title: input.title,
    status: input.status ?? "draft",
    createdBy: input.adminId,
  });

  const creatorUsername = await getAdminUsernameById(input.adminId);

  return {
    ok: true as const,
    page: {
      slug: page.slug,
      title: page.title,
      status: page.status,
      createdAt: page.createdAt.toISOString(),
      createdByUsername: creatorUsername,
      updatedAt: null,
      updatedByUsername: null,
    },
  };
}

/**
 * Returns one content page by slug, mapped to shared API model.
 *
 * @param slug - Page slug.
 * @returns Full content page or `null`.
 */
export async function getManagedContentPage(slug: string) {
  const page = await getContentPageBySlug(slug);
  if (!page) {
    return null;
  }

  const ids = [page.createdBy, page.updatedBy].filter((id): id is number => id != null);
  const usernames = await getAdminUsernamesByIds(ids);

  const result: ContentPage = {
    slug: page.slug,
    title: page.title,
    content: page.content,
    status: page.status,
    createdAt: page.createdAt.toISOString(),
    createdByUsername: page.createdBy ? (usernames.get(page.createdBy) ?? null) : null,
    updatedAt: toIso(page.updatedAt),
    updatedByUsername: page.updatedBy ? (usernames.get(page.updatedBy) ?? null) : null,
  };

  return result;
}

/**
 * Updates page markdown/content body.
 *
 * @param input - Slug/content/admin payload.
 * @returns Lightweight payload with updated timestamp and editor, or `null` if missing.
 */
export async function updateManagedContentPageBody(input: {
  slug: string;
  content: string;
  adminId: number;
}) {
  const updated = await updateContentPageBody(input.slug, input.content, input.adminId);
  if (!updated) {
    return null;
  }

  const editorUsername = await getAdminUsernameById(input.adminId);

  return {
    slug: updated.slug,
    updatedAt: toIso(updated.updatedAt),
    updatedByUsername: editorUsername,
  };
}

/**
 * Updates metadata (`slug`, `title`, `status`) with slug collision guard.
 *
 * @param input - Metadata update payload.
 * @returns Result union with `ok` flag and reason/page payload.
 */
export async function updateManagedContentPageMeta(input: {
  currentSlug: string;
  newSlug?: string;
  title?: string;
  status?: ContentStatus;
  adminId: number;
}) {
  if (input.newSlug && input.newSlug !== input.currentSlug) {
    const exists = await contentPageSlugExists(input.newSlug);
    if (exists) {
      return { ok: false as const, reason: "slug_conflict" as const };
    }
  }

  const updated = await updateContentPageMeta(
    input.currentSlug,
    { slug: input.newSlug, title: input.title, status: input.status },
    input.adminId,
  );
  if (!updated) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return {
    ok: true as const,
    page: {
      slug: updated.slug,
      title: updated.title,
      status: updated.status,
      updatedAt: toIso(updated.updatedAt),
    },
  };
}

/**
 * Deletes a content page by slug.
 *
 * @param slug - Page slug.
 * @returns `true` when a page was deleted, otherwise `false`.
 */
export async function deleteManagedContentPage(slug: string): Promise<boolean> {
  return deleteContentPage(slug);
}
