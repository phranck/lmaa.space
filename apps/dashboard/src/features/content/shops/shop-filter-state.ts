import type { ShopVisibility } from "@lmaa/shared";

import type { SortState } from "@/components/ui/Table.tsx";
import { parseTableSortFromSearchParams } from "@/lib/table-sort-storage.ts";

export type VisibilityFilter = "all" | ShopVisibility;
export type GeoFilter = "all" | "with" | "without" | "needsReview";

export const SHOP_SORTABLE_COLUMNS = new Set(["name", "region", "likes"]);

export function parseShopsSort(searchParams: URLSearchParams): SortState | null {
  return parseTableSortFromSearchParams(searchParams, SHOP_SORTABLE_COLUMNS);
}

export const EXPORT_LIMITS = [10, 20, 30, 50, 100, 150, 200] as const;
export type ExportLimit = (typeof EXPORT_LIMITS)[number];

export type ShopsFilterState = {
  categoryFilter: string;
  visibilityFilter: VisibilityFilter;
  geoFilter: GeoFilter;
  exportLimit: ExportLimit;
  importError: string | null;
};

export type ShopsFilterAction =
  | { type: "setCategoryFilter"; value: string }
  | { type: "setVisibilityFilter"; value: VisibilityFilter }
  | { type: "setGeoFilter"; value: GeoFilter }
  | { type: "setExportLimit"; value: ExportLimit }
  | { type: "setImportError"; value: string | null };

export const INITIAL_FILTER_STATE: ShopsFilterState = {
  categoryFilter: "all",
  visibilityFilter: "public",
  geoFilter: "all",
  exportLimit: 50,
  importError: null,
};

export function shopsFilterReducer(state: ShopsFilterState, action: ShopsFilterAction): ShopsFilterState {
  switch (action.type) {
    case "setCategoryFilter":
      return { ...state, categoryFilter: action.value };
    case "setVisibilityFilter":
      return { ...state, visibilityFilter: action.value };
    case "setGeoFilter":
      return { ...state, geoFilter: action.value };
    case "setExportLimit":
      return { ...state, exportLimit: action.value };
    case "setImportError":
      return { ...state, importError: action.value };
  }
}
