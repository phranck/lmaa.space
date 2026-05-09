import { encodeShopToken } from "@lmaa/shared";

import { env } from "../config/env.js";
import type { Category, Submission } from "../db/schema.js";

/**
 * Discriminated union describing the entity a social-media post is about.
 * Consumed by `buildPostVariables` (template variable substitution) and
 * `idempotencyEntityKey` (per-entity idempotency).
 */
export type PostContext =
  | {
      kind: "submission";
      submission: Submission;
      newShopId: number;
      adminNote: string;
      categoryNames: string[];
    }
  | {
      kind: "category";
      category: Category;
    };

/**
 * Renders the variable map used to substitute `{{name}}` placeholders in
 * Mastodon and Bluesky post bodies. Variables exposed differ per scope.
 */
export function buildPostVariables(ctx: PostContext): Record<string, string> {
  if (ctx.kind === "submission") {
    return {
      shopName: ctx.submission.shopName,
      shopUrl: ctx.submission.shopUrl,
      shopDescription: ctx.submission.description ?? "",
      shopRegion: Array.isArray(ctx.submission.region)
        ? ctx.submission.region.join(", ")
        : "",
      shopShipping: ctx.submission.shipping ?? "",
      shopPickup: ctx.submission.pickup ?? "",
      shopContactEmail: ctx.submission.contactEmail ?? "",
      shopCategories: ctx.categoryNames.join(", "),
      shopPageUrl: `${env.FRONTEND_URL}/shop/${encodeShopToken(ctx.newShopId)}`,
      adminNote: ctx.adminNote,
      frontendUrl: env.FRONTEND_URL,
      dashboardUrl: env.DASHBOARD_URL,
    };
  }
  return {
    categoryName: ctx.category.name,
    categorySlug: ctx.category.slug,
    categoryDescription: ctx.category.description ?? "",
    categoryUrl: `${env.FRONTEND_URL}/category/${ctx.category.slug}`,
    categoryImageUrl: ctx.category.imageUrl ?? "",
    frontendUrl: env.FRONTEND_URL,
    dashboardUrl: env.DASHBOARD_URL,
  };
}

/**
 * Returns the per-entity idempotency key fragment, e.g. `submission:42` or
 * `category:7`. Used by mastodon's `Idempotency-Key` header to prevent
 * duplicate posts for the same entity/template/account combination.
 */
export function idempotencyEntityKey(ctx: PostContext): string {
  return ctx.kind === "submission"
    ? `submission:${ctx.submission.id}`
    : `category:${ctx.category.id}`;
}
