import type { PublicRejectedShopsResponse } from "@lmaa/contracts";

import { apiGet } from "@/lib/api";
import {
  parseContentShortcodeSegments,
  type RejectedShopsTableIsland,
} from "@/lib/content-shortcode-segments";
import { stripMarkdown } from "@/lib/markdown";
import { renderMarkdownSSR as renderMarkdown } from "@/lib/markdown-ssr";

export interface ContentPageView {
  title: string;
  content: string;
  showTitle: boolean;
}

export type RenderedContentSegment =
  | { type: "html"; html: string }
  | (RejectedShopsTableIsland & { initialData: PublicRejectedShopsResponse });

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

      return {
        ...segment,
        initialData: await loadInitialRejectedShopsData(segment.defaultPageSize),
      };
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

export function hasWideContentSegment(segments: RenderedContentSegment[]): boolean {
  return segments.some((segment) => segment.type === "rejected-shops-table");
}
