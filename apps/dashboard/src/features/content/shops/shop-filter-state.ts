import type { ShopVisibility } from "@lmaa/shared";

import type { SortState } from "@/components/ui/Table.tsx";

export type VisibilityFilter = "all" | ShopVisibility;
export type GeoFilter = "all" | "with" | "without" | "needsReview";

const SHOP_SORTABLE_COLUMNS = new Set(["name", "region", "likes"]);

export function parseShopsSort(searchParams: URLSearchParams): SortState | null {
  const id = searchParams.get("sort");
  const dir = searchParams.get("dir");
  if (!id || !dir) return null;
  if (!SHOP_SORTABLE_COLUMNS.has(id)) return null;
  if (dir !== "asc" && dir !== "desc") return null;
  return { id, dir };
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
