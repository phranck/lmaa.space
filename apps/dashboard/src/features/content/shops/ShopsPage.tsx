import {
  EyeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PauseCircleIcon,
  SealWarningIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import type { ShopVisibility } from "@lmaa/shared";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { ExportButton } from "@/components/ui/ExportButton.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { ImportButton } from "@/components/ui/ImportButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { type SortState } from "@/components/ui/Table.tsx";
import { Toolbar } from "@/components/ui/Toolbar.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import {
  useAdminShops,
  useImportShopReviewResults,
  useShopVisibilityCounts,
} from "@/features/content/hooks/useAdminShops.ts";
import { ShopTable } from "@/features/content/shops/ShopTable.tsx";

type VisibilityFilter = "all" | ShopVisibility;
type GeoFilter = "all" | "with" | "without" | "needsReview";
const SHOP_SORTABLE_COLUMNS = new Set(["name", "region"]);

function parseShopsSort(searchParams: URLSearchParams): SortState | null {
  const id = searchParams.get("sort");
  const dir = searchParams.get("dir");
  if (!id || !dir) return null;
  if (!SHOP_SORTABLE_COLUMNS.has(id)) return null;
  if (dir !== "asc" && dir !== "desc") return null;
  return { id, dir };
}

const EXPORT_LIMITS = [10, 20, 30, 50, 100, 150, 200] as const;
type ExportLimit = (typeof EXPORT_LIMITS)[number];

type ShopsFilterState = {
  categoryFilter: string;
  visibilityFilter: VisibilityFilter;
  geoFilter: GeoFilter;
  exportLimit: ExportLimit;
  importError: string | null;
};

type ShopsFilterAction =
  | { type: "setCategoryFilter"; value: string }
  | { type: "setVisibilityFilter"; value: VisibilityFilter }
  | { type: "setGeoFilter"; value: GeoFilter }
  | { type: "setExportLimit"; value: ExportLimit }
  | { type: "setImportError"; value: string | null };

const INITIAL_FILTER_STATE: ShopsFilterState = {
  categoryFilter: "all",
  visibilityFilter: "public",
  geoFilter: "all",
  exportLimit: 50,
  importError: null,
};

function shopsFilterReducer(state: ShopsFilterState, action: ShopsFilterAction): ShopsFilterState {
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

/**
 * Shop management route with filters and moderation actions.
 *
 * @returns Shops administration page.
 */
export function ShopsPage() {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories = [] } = useAdminCategories();
  const search = searchParams.get("q") ?? "";
  const [filterState, dispatch] = useReducer(shopsFilterReducer, INITIAL_FILTER_STATE);
  const { categoryFilter, visibilityFilter, geoFilter, exportLimit, importError } = filterState;
  const importMutation = useImportShopReviewResults();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  const sort = useMemo(() => parseShopsSort(searchParams), [searchParams]);

  function setSearch(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  }

  const { data: shops = [], isLoading } = useAdminShops(
    visibilityFilter === "all" ? undefined : visibilityFilter,
  );
  const { data: counts } = useShopVisibilityCounts();

  const searchLower = search.toLowerCase();
  const filtered = useMemo(
    () =>
      shops.filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchLower) || s.url.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
        if (categoryFilter !== "all") {
          if (!s.categories.some((c) => c.slug === categoryFilter)) return false;
        }
        if (geoFilter === "with")
          return s.headquarters?.latitude != null && s.headquarters?.longitude != null;
        if (geoFilter === "without")
          return s.headquarters?.latitude == null || s.headquarters?.longitude == null;
        if (geoFilter === "needsReview") return s.needsReview === true;
        return true;
      }),
    [shops, searchLower, categoryFilter, geoFilter],
  );

  const filterOptions = useMemo<DropdownOption<VisibilityFilter>[]>(
    () => [
      {
        value: "all",
        label: shopsMessages.filters.all,
        icon: <SquaresFourIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: counts?.all,
      },
      {
        value: "public",
        label: shopsMessages.filters.public,
        icon: <EyeIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: counts?.public,
      },
      {
        value: "onhold",
        label: shopsMessages.filters.onhold,
        icon: <PauseCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: counts?.onhold,
      },
      {
        value: "deleted",
        label: shopsMessages.filters.deleted,
        icon: <TrashIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: counts?.deleted,
      },
      {
        value: "rejected",
        label: shopsMessages.filters.rejected,
        icon: <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />,
        count: counts?.rejected,
      },
    ],
    [shopsMessages, counts],
  );

  const geoFilterOptions = useMemo<DropdownOption<GeoFilter>[]>(
    () => {
      const withGeo = shops.filter(
        (s) => s.headquarters?.latitude != null && s.headquarters?.longitude != null,
      ).length;
      const withoutGeo = shops.filter(
        (s) => s.headquarters?.latitude == null || s.headquarters?.longitude == null,
      ).length;
      const needsReviewCount = shops.filter((s) => s.needsReview).length;
      return [
        {
          value: "all",
          label: shopsMessages.geoFilter.all,
          icon: <SquaresFourIcon weight="duotone" className="w-3.5 h-3.5" />,
        },
        {
          value: "with",
          label: shopsMessages.geoFilter.withGeo,
          icon: <MapPinIcon weight="duotone" className="w-3.5 h-3.5" />,
          count: withGeo,
        },
        {
          value: "without",
          label: shopsMessages.geoFilter.withoutGeo,
          icon: <MapPinIcon weight="duotone" className="w-3.5 h-3.5" />,
          count: withoutGeo,
        },
        {
          value: "needsReview",
          label: shopsMessages.geoFilter.needsReview,
          icon: <SealWarningIcon weight="duotone" className="w-3.5 h-3.5" />,
          count: needsReviewCount,
        },
      ];
    },
    [shopsMessages, shops],
  );

  const categoryFilterOptions = useMemo<DropdownOption<string>[]>(
    () => [
      {
        value: "all",
        label: shopsMessages.categoryFilter.all,
        icon: <SquaresFourIcon weight="duotone" className="w-3.5 h-3.5" />,
      },
      ...categories.map((cat) => ({
        value: cat.slug,
        label: cat.name,
      })),
    ],
    [shopsMessages, categories],
  );

  function handleSortChange(nextSort: SortState | null) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextSort) {
      nextParams.set("sort", nextSort.id);
      nextParams.set("dir", nextSort.dir);
    } else {
      nextParams.delete("sort");
      nextParams.delete("dir");
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as unknown;
        if (!Array.isArray(parsed)) {
          dispatch({ type: "setImportError", value: shopsMessages.importInvalidFile });
          return;
        }
        const entries = parsed as Array<Record<string, unknown>>;
        importMutation.mutate(entries, {
          onError: () => dispatch({ type: "setImportError", value: shopsMessages.importError }),
        });
      } catch {
        dispatch({ type: "setImportError", value: shopsMessages.importInvalidFile });
      }
    };
    reader.readAsText(file);
  }

  function handleExport() {
    const rows = filtered
      .slice(0, exportLimit)
      .map((s) => ({ shopId: s.id, shopUrl: s.url }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shops-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <PageLayout>
      <PageHeader title={shopsMessages.title}>
        <FilterDropdown
          value={categoryFilter}
          onChange={(v: string) => dispatch({ type: "setCategoryFilter", value: v })}
          options={categoryFilterOptions}
          storageKey="shops-filter-category"
          searchable
          searchPlaceholder={shopsMessages.searchPlaceholder}
        />

        <FilterDropdown
          value={geoFilter}
          onChange={(v: GeoFilter) => dispatch({ type: "setGeoFilter", value: v })}
          options={geoFilterOptions}
          storageKey="shops-filter-geo"
        />

        <FilterDropdown
          value={visibilityFilter}
          onChange={(v: VisibilityFilter) => dispatch({ type: "setVisibilityFilter", value: v })}
          options={filterOptions}
          storageKey="shops-filter-visibility"
        />

        <ImportButton
          onFileSelected={handleImportFile}
          disabled={importMutation.isPending}
          tooltip={shopsMessages.importTooltip}
          label={shopsMessages.importLabel}
        />

        <ExportButton
          onClick={handleExport}
          disabled={filtered.length === 0}
          tooltip={shopsMessages.exportTooltip}
          label={shopsMessages.exportLabel}
        >
          <select
            value={exportLimit}
            onChange={(e) => dispatch({ type: "setExportLimit", value: Number(e.target.value) as ExportLimit })}
            className="py-1.5 pl-3 pr-1 text-sm bg-[var(--ds-surface)] text-[var(--ds-text)] focus:outline-none border-r border-[var(--ds-btn-primary-border)]"
            aria-label="Anzahl zu exportierender Shops"
          >
            {EXPORT_LIMITS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </ExportButton>

      </PageHeader>

      <AlertDialog
        open={importError !== null}
        title={shopsMessages.importError}
        variant="error"
        onClose={() => dispatch({ type: "setImportError", value: null })}
      >
        {importError}
      </AlertDialog>

      <PageBody>
        {isLoading && (
          <div className="space-y-px">
            {Array.from({ length: 8 }, (_, i) => `sk-${i}`).map((key) => (
              <div
                key={key}
                className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
              />
            ))}
          </div>
        )}

        {!isLoading && shops.length === 0 && (
          <ContentUnavailableView
            icon={<StorefrontIcon weight="duotone" aria-hidden />}
            title={shopsMessages.noShops}
            subtitle={shopsMessages.noShopsHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && shops.length > 0 && filtered.length === 0 && (
          <ContentUnavailableView
            icon={<MagnifyingGlassIcon weight="duotone" aria-hidden />}
            title={`${shopsMessages.noResultsPrefix} „${search}".`}
            subtitle={shopsMessages.noResultsHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="-mx-3 -mt-3">
            <ShopTable
              shops={filtered}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={(shop) =>
                navigate(`/shops/${shop.id}`, {
                  state: { returnTo: `${location.pathname}${location.search}` },
                })
              }
            />
          </div>
        )}
      </PageBody>

      <Toolbar className="sticky bottom-0 z-10">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={shopsMessages.searchPlaceholder}
            className="py-1.5 w-104 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
            >
              <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[var(--ds-text-subtle)]">
              <kbd className="inline-flex items-center justify-center h-4.5 min-w-4.5 px-1 rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] font-sans leading-none">&#8984;</kbd>
              <kbd className="inline-flex items-center justify-center h-4.5 min-w-4.5 px-1 rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] font-sans leading-none">K</kbd>
            </span>
          )}
        </div>
      </Toolbar>
    </PageLayout>
  );
}
