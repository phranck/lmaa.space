import { SHOP_VISIBILITIES, type ShopVisibility } from "@lmaa/shared";

import type { SortState } from "@/components/ui/Table.tsx";
import { parseTableSortFromSearchParams } from "@/lib/table-sort-storage.ts";

export type VisibilityFilter = "all" | ShopVisibility;

/**
 * Every column of the shop table, named once.
 *
 * The table builds its columns from these and the set below is built from them
 * too, because the two used to be written out separately and drifted: a column
 * added to the table alone gets a header that reacts to a click and sorts
 * nothing, since the sort travels through the address bar and the parser
 * discards a name it does not know.
 */
export const ShopColumnId = {
  Name: "name",
  Categories: "categories",
  Region: "region",
  Date: "date",
  Likes: "likes",
  Actions: "actions",
} as const;

/** One column of the shop table. */
export type ShopColumnId = (typeof ShopColumnId)[keyof typeof ShopColumnId];

/** The columns a click on the header sorts by. */
export const SHOP_SORTABLE_COLUMNS = new Set<string>([
  ShopColumnId.Name,
  ShopColumnId.Region,
  ShopColumnId.Date,
  ShopColumnId.Likes,
]);
const DEFAULT_SHOPS_VISIBILITY_FILTER: VisibilityFilter = "public";

const SHOP_VISIBILITY_FILTER_VALUES = new Set<VisibilityFilter>(["all", ...SHOP_VISIBILITIES]);

export function parseShopsSort(searchParams: URLSearchParams): SortState | null {
  return parseTableSortFromSearchParams(searchParams, SHOP_SORTABLE_COLUMNS);
}

export const EXPORT_LIMITS = [10, 20, 30, 50, 100, 150, 200] as const;
export type ExportLimit = (typeof EXPORT_LIMITS)[number];

export type ShopsFilterState = {
  categoryFilter: string;
  visibilityFilter: VisibilityFilter;
  exportLimit: ExportLimit;
  importError: string | null;
};

export type ShopsFilterAction =
  | { type: "setCategoryFilter"; value: string }
  | { type: "setVisibilityFilter"; value: VisibilityFilter }
  | { type: "setExportLimit"; value: ExportLimit }
  | { type: "setImportError"; value: string | null };

export const INITIAL_FILTER_STATE: ShopsFilterState = {
  categoryFilter: "all",
  visibilityFilter: DEFAULT_SHOPS_VISIBILITY_FILTER,
  exportLimit: 50,
  importError: null,
};

export function parseShopsVisibilityFilter(value: string | null): VisibilityFilter | null {
  if (!value) return null;
  return SHOP_VISIBILITY_FILTER_VALUES.has(value as VisibilityFilter)
    ? (value as VisibilityFilter)
    : null;
}

export function readStoredShopsVisibilityFilter(storageKey: string): VisibilityFilter | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = parseShopsVisibilityFilter(stored);
    if (stored !== null && parsed === null) {
      window.localStorage.removeItem(storageKey);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredShopsVisibilityFilter(
  storageKey: string,
  value: VisibilityFilter,
): void {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {}
}

export function applyShopsVisibilityFilterSearchParam(
  searchParams: URLSearchParams,
  value: VisibilityFilter,
): URLSearchParams {
  const nextParams = new URLSearchParams(searchParams);
  if (value === DEFAULT_SHOPS_VISIBILITY_FILTER) {
    nextParams.delete("visibility");
  } else {
    nextParams.set("visibility", value);
  }
  return nextParams;
}

export function shopsFilterReducer(state: ShopsFilterState, action: ShopsFilterAction): ShopsFilterState {
  switch (action.type) {
    case "setCategoryFilter":
      return { ...state, categoryFilter: action.value };
    case "setVisibilityFilter":
      return { ...state, visibilityFilter: action.value };
    case "setExportLimit":
      return { ...state, exportLimit: action.value };
    case "setImportError":
      return { ...state, importError: action.value };
  }
}
