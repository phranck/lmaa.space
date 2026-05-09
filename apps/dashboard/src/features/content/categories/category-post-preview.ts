import { FRONTEND_URL } from "@/lib/env.ts";

const VAR_REGEX = /\{\{(\w+)\}\}/g;

interface CategoryPostPreviewContext {
  category: {
    name: string;
    slug: string;
    description: string;
    imageUrl: string | null;
  };
}

/**
 * Renders a template body with substitution variables filled from the
 * pending category form. Used for live char-count validation in the new-
 * category dialog so the moderator can see whether a post will fit the
 * platform limit before saving.
 */
export function renderCategoryPostPreview(
  body: string | null,
  context: CategoryPostPreviewContext,
): string {
  if (!body) return "";
  const variables = buildPreviewVariables(context);
  return body.replace(VAR_REGEX, (_, name: string) => variables[name] ?? "");
}

function buildPreviewVariables(context: CategoryPostPreviewContext): Record<string, string> {
  const dashboardUrl = typeof window !== "undefined" ? window.location.origin : "";
  return {
    categoryName: context.category.name,
    categorySlug: context.category.slug,
    categoryDescription: context.category.description,
    categoryUrl: `${FRONTEND_URL}/category/${context.category.slug}`,
    categoryImageUrl: context.category.imageUrl ?? "",
    frontendUrl: FRONTEND_URL,
    dashboardUrl,
  };
}
