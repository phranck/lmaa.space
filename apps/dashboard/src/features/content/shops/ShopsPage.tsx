import {
  EyeIcon,
  MagnifyingGlassIcon,
  PauseCircleIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useReducer } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DashboardIconButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardCombobox, DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { ExportButton } from "@/components/ui/ExportButton.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { ImportButton } from "@/components/ui/ImportButton.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { type SortState } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import {
  EXPORT_LIMITS,
  type ExportLimit,
  INITIAL_FILTER_STATE,
  SHOP_SORTABLE_COLUMNS,
  type VisibilityFilter,
  applyShopsVisibilityFilterSearchParam,
  parseShopsSort,
  parseShopsVisibilityFilter,
  readStoredShopsVisibilityFilter,
  shopsFilterReducer,
  writeStoredShopsVisibilityFilter,
} from "@/features/content/shops/shop-filter-state.ts";
import { ShopTable } from "@/features/content/shops/ShopTable.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";
import { readStoredTableSort, writeStoredTableSort } from "@/lib/table-sort-storage.ts";

import {
  useAdminShops,
  useImportShopReviewResults,
  useShopVisibilityCounts,
} from "./hooks/useAdminShops.ts";

type ShopsMessages = ReturnType<typeof useI18n>["messages"]["shops"];
type ShopCategoryOption = { name: string; slug: string };
type ShopVisibilityCounts = Record<VisibilityFilter, number>;

function useShopFilterOptions({
  categories,
  counts,
  shopsMessages,
}: {
  categories: ShopCategoryOption[];
  counts?: ShopVisibilityCounts;
  shopsMessages: ShopsMessages;
}) {
  const filterOptions = useMemo<DropdownOption<VisibilityFilter>[]>(
    () => [
      {
        value: "all",
        label: shopsMessages.filters.all,
        icon: <SquaresFourIcon weight="duotone" className="size-3.5" />,
        count: counts?.all,
      },
      {
        value: "public",
        label: shopsMessages.filters.public,
        icon: <EyeIcon weight="duotone" className="size-3.5" />,
        count: counts?.public,
      },
      {
        value: "onhold",
        label: shopsMessages.filters.onhold,
        icon: <PauseCircleIcon weight="duotone" className="size-3.5" />,
        count: counts?.onhold,
      },
      {
        value: "deleted",
        label: shopsMessages.filters.deleted,
        icon: <TrashIcon weight="duotone" className="size-3.5" />,
        count: counts?.deleted,
      },
      {
        value: "rejected",
        label: shopsMessages.filters.rejected,
        icon: <XCircleIcon weight="duotone" className="size-3.5" />,
        count: counts?.rejected,
      },
    ],
    [shopsMessages, counts],
  );

  const categoryFilterOptions = useMemo<DropdownOption<string>[]>(
    () => [
      {
        value: "all",
        label: shopsMessages.categoryFilter.all,
        icon: <SquaresFourIcon weight="duotone" className="size-3.5" />,
      },
      ...categories.map((cat) => ({
        value: cat.slug,
        label: cat.name,
      })),
    ],
    [shopsMessages, categories],
  );

  return { categoryFilterOptions, filterOptions };
}

function ShopsHeaderActions({
  categoryFilter,
  categoryFilterOptions,
  exportDisabled,
  exportLimit,
  importPending,
  shopsMessages,
  visibilityFilter,
  visibilityFilterOptions,
  onCategoryFilterChange,
  onExport,
  onExportLimitChange,
  onImportFile,
  onVisibilityFilterChange,
}: {
  categoryFilter: string;
  categoryFilterOptions: DropdownOption<string>[];
  exportDisabled: boolean;
  exportLimit: ExportLimit;
  importPending: boolean;
  shopsMessages: ShopsMessages;
  visibilityFilter: VisibilityFilter;
  visibilityFilterOptions: DropdownOption<VisibilityFilter>[];
  onCategoryFilterChange: (value: string) => void;
  onExport: () => void;
  onExportLimitChange: (value: ExportLimit) => void;
  onImportFile: (file: File) => void;
  onVisibilityFilterChange: (value: VisibilityFilter) => void;
}) {
  return (
    <>
      <FilterDropdown
        value={categoryFilter}
        onChange={onCategoryFilterChange}
        options={categoryFilterOptions}
        storageKey="shops-filter-category"
        searchable
        searchPlaceholder={shopsMessages.searchPlaceholder}
      />

      <FilterDropdown
        value={visibilityFilter}
        onChange={onVisibilityFilterChange}
        options={visibilityFilterOptions}
      />

      <ImportButton
        onFileSelected={onImportFile}
        disabled={importPending}
        tooltip={shopsMessages.importTooltip}
        label={shopsMessages.importLabel}
      />

      <ExportButton
        onClick={onExport}
        disabled={exportDisabled}
        tooltip={shopsMessages.exportTooltip}
        label={shopsMessages.exportLabel}
      >
        <DashboardCombobox
          aria-label="Anzahl zu exportierender Shops"
          value={String(exportLimit)}
          onValueChange={(value) => onExportLimitChange(Number(value) as ExportLimit)}
          className="h-full w-20 shrink-0 rounded-none border-y-0 border-l-0 border-r border-[var(--ds-btn-primary-border)] bg-[var(--ds-surface)]"
          matchTriggerWidth={false}
          options={EXPORT_LIMITS.map((limit) => ({
            value: String(limit),
            label: String(limit),
          }))}
        />
      </ExportButton>
    </>
  );
}

function ShopsFooterSearch({
  placeholder,
  search,
  onSearchChange,
}: {
  placeholder: string;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <PageFooter>
      <div className="flex-1 flex justify-center">
        <div className="relative">
          <DashboardInput
            id="shops-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-104 pr-8"
          />
          {search ? (
            <DashboardIconButton
              aria-label="Suche leeren"
              onClick={() => onSearchChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 border-transparent"
              variant="ghost"
            >
              <XCircleIcon weight="duotone" className="size-3.5" />
            </DashboardIconButton>
          ) : (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[var(--ds-text-subtle)]">
              <kbd className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] px-1 font-sans leading-none">
                &#8984;
              </kbd>
              <kbd className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] px-1 font-sans leading-none">
                K
              </kbd>
            </span>
          )}
        </div>
      </div>
    </PageFooter>
  );
}

/**
 * Shop management route with filters and moderation actions.
 *
 * @returns Shops administration page.
 */
export function ShopsPage() {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories = [] } = useAdminCategories();
  const search = searchParams.get("q") ?? "";
  const visibilityStorageKey = getSegmentedStorageKey(user?.id, "shops:list:visibility");
  const urlVisibilityFilter = parseShopsVisibilityFilter(searchParams.get("visibility"));
  const [filterState, dispatch] = useReducer(
    shopsFilterReducer,
    INITIAL_FILTER_STATE,
    (initialState) => ({
      ...initialState,
      visibilityFilter:
        urlVisibilityFilter ??
        readStoredShopsVisibilityFilter(visibilityStorageKey) ??
        initialState.visibilityFilter,
    }),
  );
  const { categoryFilter, visibilityFilter, exportLimit, importError } = filterState;
  const importMutation = useImportShopReviewResults();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && e.metaKey) {
        e.preventDefault();
        document.getElementById("shops-search")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (urlVisibilityFilter) {
      dispatch({ type: "setVisibilityFilter", value: urlVisibilityFilter });
      writeStoredShopsVisibilityFilter(visibilityStorageKey, urlVisibilityFilter);
      return;
    }

    const stored = readStoredShopsVisibilityFilter(visibilityStorageKey);
    if (stored) {
      dispatch({ type: "setVisibilityFilter", value: stored });
    }
  }, [urlVisibilityFilter, visibilityStorageKey]);

  const sortStorageKey = getSegmentedStorageKey(user?.id, "shops:list:sort");
  const sort = useMemo(() => {
    const urlSort = parseShopsSort(searchParams);
    if (urlSort) return urlSort;
    const storedSort = readStoredTableSort(sortStorageKey, SHOP_SORTABLE_COLUMNS);
    return storedSort === undefined ? null : storedSort;
  }, [searchParams, sortStorageKey]);

  function setSearch(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  }

  function handleVisibilityFilterChange(nextVisibilityFilter: VisibilityFilter) {
    dispatch({ type: "setVisibilityFilter", value: nextVisibilityFilter });
    writeStoredShopsVisibilityFilter(visibilityStorageKey, nextVisibilityFilter);
    setSearchParams(applyShopsVisibilityFilterSearchParam(searchParams, nextVisibilityFilter), {
      replace: true,
    });
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
        return true;
      }),
    [shops, searchLower, categoryFilter],
  );

  const { categoryFilterOptions, filterOptions } = useShopFilterOptions({
    categories,
    counts,
    shopsMessages,
  });
  const activeVisibilityLabel =
    filterOptions.find((option) => option.value === visibilityFilter)?.label ??
    shopsMessages.filters.public;
  const emptyShopsTitle =
    visibilityFilter === "all"
      ? shopsMessages.noShops
      : `${shopsMessages.noFilteredShopsPrefix} „${activeVisibilityLabel}“.`;
  const emptyShopsHint =
    visibilityFilter === "all" ? shopsMessages.noShopsHint : shopsMessages.noFilteredShopsHint;

  function handleSortChange(nextSort: SortState | null) {
    writeStoredTableSort(sortStorageKey, nextSort, SHOP_SORTABLE_COLUMNS);
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
    const rows = filtered.slice(0, exportLimit).map((s) => ({ shopId: s.id, shopUrl: s.url }));
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
    <PageLayout className="min-h-auto">
      <PageHeader title={shopsMessages.title}>
        <ShopsHeaderActions
          categoryFilter={categoryFilter}
          categoryFilterOptions={categoryFilterOptions}
          exportDisabled={filtered.length === 0}
          exportLimit={exportLimit}
          importPending={importMutation.isPending}
          shopsMessages={shopsMessages}
          visibilityFilter={visibilityFilter}
          visibilityFilterOptions={filterOptions}
          onCategoryFilterChange={(value) => dispatch({ type: "setCategoryFilter", value })}
          onExport={handleExport}
          onExportLimitChange={(value) => dispatch({ type: "setExportLimit", value })}
          onImportFile={handleImportFile}
          onVisibilityFilterChange={handleVisibilityFilterChange}
        />
      </PageHeader>

      <AlertDialog
        open={importError !== null}
        title={shopsMessages.importError}
        variant="error"
        onClose={() => dispatch({ type: "setImportError", value: null })}
      >
        {importError}
      </AlertDialog>

      <PageBody className="min-h-auto">
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
            chromeless
            icon={<StorefrontIcon weight="duotone" aria-hidden />}
            title={emptyShopsTitle}
            subtitle={emptyShopsHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && shops.length > 0 && filtered.length === 0 && (
          <ContentUnavailableView
            chromeless
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

      <ShopsFooterSearch
        placeholder={shopsMessages.searchPlaceholder}
        search={search}
        onSearchChange={setSearch}
      />
    </PageLayout>
  );
}
