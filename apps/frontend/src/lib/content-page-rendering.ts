import type { PublicRejectedShopsResponse } from "@lmaa/contracts";
import type { ContentWidth } from "@lmaa/shared";

import { apiGet } from "@/lib/api";
import {
  parseContentShortcodeSegments,
  type RejectedShopsTableIsland,
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
