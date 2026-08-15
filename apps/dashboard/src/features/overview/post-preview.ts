import type { Category, Submission } from "@lmaa/shared";

import { FRONTEND_URL } from "@/lib/env.ts";

const VAR_REGEX = /\{\{(\w+)\}\}/g;
const SHOP_TOKEN_PLACEHOLDER = "12345678";

interface PostPreviewContext {
  submission: Submission;
  adminNote: string;
  categories: Category[];
}

/**
 * Renders a template body with substitution variables filled from the
 * pending submission. Used for live char-count validation in the approve
 * dialog so the moderator can see whether a post will fit the platform
 * limit before approving.
 *
 * `shopPageUrl` uses a deterministic placeholder slug — the real slug is
 * generated server-side at approval time, but its length matches the 8-char
 * `encodeShopToken` output so the count is realistic.
 */
export function renderPostPreview(body: string | null, context: PostPreviewContext): string {
  if (!body) return "";
  const variables = buildPreviewVariables(context);
  return body.replace(VAR_REGEX, (_, name: string) => variables[name] ?? "");
}

function buildPreviewVariables(context: PostPreviewContext): Record<string, string> {
  const { submission, adminNote, categories } = context;
  const categoryNames = submission.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const dashboardUrl = typeof window !== "undefined" ? window.location.origin : "";
  return {
    shopName: submission.shopName,
    shopUrl: submission.shopUrl,
    shopDescription: submission.description ?? "",
    shopRegion: submission.region.join(", "),
    shopShipping: submission.shipping ?? "",
    shopPickup: submission.pickup ?? "",
    shopContactEmail: submission.contactEmail ?? "",
    shopCategories: categoryNames.join(", "),
    shopPageUrl: `${FRONTEND_URL}/shop/${SHOP_TOKEN_PLACEHOLDER}`,
    adminNote,
    frontendUrl: FRONTEND_URL,
    dashboardUrl,
  };
}
