import type { PublicRejectedShopsResponse } from "@lmaa/contracts";
import type { ContentWidth } from "@lmaa/shared";

import { apiGet } from "@/lib/api";
import {
  parseContentShortcodeSegments,
  type RejectedShopsTableIsland,
  type SponsorsIsland,
  type SupportLadderIsland,
} from "@/lib/content-shortcode-segments";
import { stripMarkdown } from "@/lib/markdown";
import { renderMarkdownSSR as renderMarkdown } from "@/lib/markdown-ssr";

export interface ContentPageView {
  title: string;
  content: string;
  showTitle: boolean;
  contentWidth: ContentWidth;
}

export type RenderedContentSegment =
  | { type: "html"; html: string }
  | (RejectedShopsTableIsland & { initialData: PublicRejectedShopsResponse })
  | SponsorsIsland
  | SupportLadderIsland;

function emptyRejectedShopsResponse(
  pageSize: RejectedShopsTableIsland["defaultPageSize"],
): PublicRejectedShopsResponse {
  return {
    entries: [],
    total: 0,
    page: 1,
    pageSize,
    search: "",
    sortBy: "rejectedAt",
    sortDir: "desc",
    metrics: {
      totalRejectedShops: 0,
      filteredRejectedShops: 0,
    },
  };
}

async function loadInitialRejectedShopsData(
  pageSize: RejectedShopsTableIsland["defaultPageSize"],
): Promise<PublicRejectedShopsResponse> {
  const params = new URLSearchParams({
    page: "1",
    pageSize,
    sortBy: "rejectedAt",
    sortDir: "desc",
  });

  try {
    return await apiGet<PublicRejectedShopsResponse>(`/rejected-shops?${params}`);
  } catch {
    return emptyRejectedShopsResponse(pageSize);
  }
}

/**
 * Renders the prose of a support ladder through the page's own Markdown
 * pipeline.
 *
 * The wording inside a shortcode is written by the same person who writes the
 * page around it, so it goes through the same renderer and the same
 * sanitisation. Headings, links, emphasis and lists therefore behave inside a
 * shortcode exactly as they do outside one.
 *
 * Titles, labels and button captions are left as plain text, because a heading
 * inside a heading is not a thing anybody wants.
 */
async function renderSupportLadderProse(segment: SupportLadderIsland): Promise<SupportLadderIsland> {
  const [intervals, variants, routes] = await Promise.all([
    Promise.all(
      segment.intervals.map(async (interval) => ({
        ...interval,
        text: await renderMarkdown(interval.text, { breaks: true }),
        options: await Promise.all(
          interval.options.map(async (option) => ({
            ...option,
            description: await renderMarkdown(option.description, { breaks: true }),
          })),
        ),
        custom: interval.custom
          ? {
              ...interval.custom,
              text: await renderMarkdown(interval.custom.text, { breaks: true }),
            }
          : undefined,
      })),
    ),
    Promise.all(
      (segment.bankAccount?.variants ?? []).map(async (variant) => ({
        ...variant,
        text: await renderMarkdown(variant.text, { breaks: true }),
        info: variant.info ? await renderMarkdown(variant.info, { breaks: true }) : undefined,
      })),
    ),
    Promise.all(
      segment.routes.map(async (route) => ({
        ...route,
        text: await renderMarkdown(route.text, { breaks: true }),
      })),
    ),
  ]);

  return {
    ...segment,
    intervals,
    bankAccount: segment.bankAccount ? { ...segment.bankAccount, variants } : undefined,
    routes,
  };
}

export async function renderContentSegments(content: string): Promise<RenderedContentSegment[]> {
  const segments = parseContentShortcodeSegments(content);
  return Promise.all(
    segments.map(async (segment) => {
      if (segment.type === "markdown") {
        return { type: "html" as const, html: await renderMarkdown(segment.content) };
      }

      // Only the rejected-shops table needs data fetched before it renders.
      // The support ladder is self-contained, because everything it shows
      // comes from the shortcode's own parameters.
      if (segment.type === "support-ladder") {
        return renderSupportLadderProse(segment);
      }

      if (segment.type === "rejected-shops-table") {
        return {
          ...segment,
          initialData: await loadInitialRejectedShopsData(segment.defaultPageSize),
        };
      }

      return segment;
    }),
  );
}

export function buildContentDescription(content: string): string {
  const markdownContent: string[] = [];
  for (const segment of parseContentShortcodeSegments(content)) {
    if (segment.type === "markdown") {
      markdownContent.push(segment.content);
    }
  }

  return stripMarkdown(markdownContent.join(" ")).slice(0, 160);
}

export function getContentWidthClass(contentWidth: ContentWidth): string {
  switch (contentWidth) {
    case "wide":
      return "max-w-5xl";
    case "full":
      return "max-w-6xl";
    default:
      return "max-w-3xl";
  }
}
