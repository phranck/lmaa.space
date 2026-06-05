export type RejectedShopsTablePageSize = "10" | "15" | "20" | "30" | "50" | "all";

export interface RejectedShopsTableToken {
  type: "rejected-shops-table";
  defaultPageSize: RejectedShopsTablePageSize;
  storageKey: string;
}

export type RejectedShopsContentSegment =
  | { type: "markdown"; content: string }
  | RejectedShopsTableToken;

const REJECTED_SHOPS_TABLE_TOKEN_REGEX = /\[\[rejected-shops-table(?:\s+([^\]]*))?\]\]/g;
const VALID_PAGE_SIZES = new Set<RejectedShopsTablePageSize>(["10", "15", "20", "30", "50", "all"]);

function parseShortcodeAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;

  for (const match of input.matchAll(attrRegex)) {
    const [, key, doubleQuoted, singleQuoted, bare] = match;
    attrs[key] = doubleQuoted ?? singleQuoted ?? bare ?? "";
  }

  return attrs;
}

function normalizePageSize(value: string | undefined): RejectedShopsTablePageSize {
  const normalized = value?.trim().toLowerCase();
  return VALID_PAGE_SIZES.has(normalized as RejectedShopsTablePageSize)
    ? (normalized as RejectedShopsTablePageSize)
    : "15";
}

function normalizeStorageKey(value: string | undefined, index: number): string {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  return normalized && normalized.length <= 80 ? normalized : `default-${index}`;
}

export function parseRejectedShopsTableTokens(content: string): RejectedShopsContentSegment[] {
  const segments: RejectedShopsContentSegment[] = [];
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of content.matchAll(REJECTED_SHOPS_TABLE_TOKEN_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "markdown", content: content.slice(lastIndex, index) });
    }

    const attrs = parseShortcodeAttributes(match[1] ?? "");
    segments.push({
      type: "rejected-shops-table",
      defaultPageSize: normalizePageSize(attrs.pageSize ?? attrs.defaultPageSize),
      storageKey: normalizeStorageKey(attrs.id, tokenIndex),
    });

    lastIndex = index + match[0].length;
    tokenIndex += 1;
  }

  if (lastIndex < content.length || segments.length === 0) {
    segments.push({ type: "markdown", content: content.slice(lastIndex) });
  }

  return segments.filter((segment) => segment.type !== "markdown" || segment.content.length > 0);
}
