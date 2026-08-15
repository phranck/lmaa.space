import { createHash } from "node:crypto";

import { asc, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import { categories, contentPages } from "../../db/schema.js";

/**
 * Slug of the published page that carries the admission criteria.
 *
 * @remarks
 * The canonical rules tell a human reviewer to load
 * `https://lmaa.space/admissioncriteria` before every run. The automated run
 * reads the same page out of the database instead of fetching our own website
 * over the network, which removes a hop that can fail and cannot return
 * anything the database does not already hold.
 */
export const ADMISSION_CRITERIA_SLUG = "admissioncriteria";

/**
 * The inputs one review run is given, apart from the shop URL itself.
 */
export interface ReviewRunContext {
  /** Markdown of the current admission criteria. */
  criteria: string;
  /** SHA-256 of `criteria`, persisted so a verdict can be tied to what it was judged against. */
  criteriaHash: string;
  /** Canonical category names the result may choose from. */
  categoryNames: string[];
}

/**
 * Fails when the admission criteria cannot be read.
 *
 * @remarks
 * Carries a stable code so the worker can route the run to `onhold` with a
 * reason a reviewer can act on, rather than a generic failure.
 */
export class MissingAdmissionCriteriaError extends Error {
  readonly code = "REVIEW_CRITERIA_MISSING";

  constructor() {
    super(
      `The admission criteria page "${ADMISSION_CRITERIA_SLUG}" is missing or unpublished, so no review can be judged against it.`,
    );
    this.name = "MissingAdmissionCriteriaError";
  }
}

/**
 * Loads the admission criteria and category list for one review run.
 *
 * @returns The criteria text, its hash, and the canonical category names.
 * @throws {MissingAdmissionCriteriaError} When the criteria page is absent.
 *
 * @remarks
 * Both are read fresh for every run. The criteria are edited in the dashboard
 * and a cached copy would let a run be judged against rules that no longer
 * apply, which the canonical rules forbid in the same words for a human.
 */
export async function loadReviewRunContext(): Promise<ReviewRunContext> {
  const [page] = await db
    .select({ content: contentPages.content })
    .from(contentPages)
    .where(eq(contentPages.slug, ADMISSION_CRITERIA_SLUG))
    .limit(1);

  const criteria = page?.content?.trim();
  if (!criteria) throw new MissingAdmissionCriteriaError();

  const categoryRows = await db
    .select({ name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));

  return {
    criteria,
    criteriaHash: createHash("sha256").update(criteria).digest("hex"),
    categoryNames: categoryRows.map((row) => row.name),
  };
}
