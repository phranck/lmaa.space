import {
  PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE,
  PUBLIC_REJECTED_SHOP_PAGE_SIZES,
  type PublicRejectedShopPageSize,
} from "@lmaa/contracts";
import {
  MARKDOWN_SHORTCODE_TOKENS,
  parseMarkdownShortcodes,
  type MarkdownShortcodeParamValue,
  type ParsedMarkdownShortcode,
} from "@lmaa/shared";

export interface RejectedShopsTableIsland {
  type: "rejected-shops-table";
  defaultPageSize: PublicRejectedShopPageSize;
  storageKey: string;
}

export type ContentShortcodeSegment =
  | { type: "markdown"; content: string }
  | RejectedShopsTableIsland;

const VALID_PAGE_SIZES = new Set<PublicRejectedShopPageSize>(PUBLIC_REJECTED_SHOP_PAGE_SIZES);

function getStringParam(value: MarkdownShortcodeParamValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizePageSize(
  value: MarkdownShortcodeParamValue | undefined,
): PublicRejectedShopPageSize {
  const normalized = getStringParam(value)?.trim().toLowerCase();
  return VALID_PAGE_SIZES.has(normalized as PublicRejectedShopPageSize)
    ? (normalized as PublicRejectedShopPageSize)
    : PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE;
}

function normalizeStorageKey(
  value: MarkdownShortcodeParamValue | undefined,
  index: number,
): string {
  const normalized = getStringParam(value)
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  return normalized && normalized.length <= 80 ? normalized : `default-${index}`;
}

function isRenderableRejectedShopsTable(
  shortcode: ParsedMarkdownShortcode,
): shortcode is ParsedMarkdownShortcode & {
  token: typeof MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable;
} {
  return (
    shortcode.token === MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable &&
    !shortcode.issues.some((issue) => issue.code === "target-forbidden")
  );
}

export function parseContentShortcodeSegments(content: string): ContentShortcodeSegment[] {
  const segments: ContentShortcodeSegment[] = [];
  let lastIndex = 0;
  let tableIndex = 0;

  for (const shortcode of parseMarkdownShortcodes(content)) {
    if (!isRenderableRejectedShopsTable(shortcode)) continue;

    if (shortcode.source.start > lastIndex) {
      segments.push({
        type: "markdown",
        content: content.slice(lastIndex, shortcode.source.start),
      });
    }

    segments.push({
      type: "rejected-shops-table",
      defaultPageSize: normalizePageSize(shortcode.params.pageSize),
      storageKey: normalizeStorageKey(shortcode.params.id, tableIndex),
    });

    lastIndex = shortcode.source.end;
    tableIndex += 1;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "markdown", content: content.slice(lastIndex) });
  }

  return segments.filter((segment) => segment.type !== "markdown" || segment.content.length > 0);
}
