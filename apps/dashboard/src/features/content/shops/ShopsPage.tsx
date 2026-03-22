import {
  DownloadSimpleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PauseCircleIcon,
  SealWarningIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TrashIcon,
  UploadSimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import type { ShopVisibility } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { FilterDropdown } from "@/components/ui/FilterDropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { type SortState } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminCategories } from "@/features/content/hooks/useAdminCategories.ts";
import {
  useAdminShops,
  useImportShopcheckResults,
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
  useAdminCategories();
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("public");
  const [geoFilter, setGeoFilter] = useState<GeoFilter>("all");
  const [exportLimit, setExportLimit] = useState<ExportLimit>(50);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const importMutation = useImportShopcheckResults();
  const sort = useMemo(() => parseShopsSort(searchParams), [searchParams]);

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
        if (geoFilter === "with")
          return s.headquarters?.latitude != null && s.headquarters?.longitude != null;
        if (geoFilter === "without")
          return s.headquarters?.latitude == null || s.headquarters?.longitude == null;
        if (geoFilter === "needsReview") return s.needsReview === true;
        return true;
      }),
    [shops, searchLower, geoFilter],
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
        // Fix broken German typographic quotes: „text" where the closing " is
        // ASCII U+0022 instead of the correct U+201C. Replace such pairs with
        // properly matched Unicode quotes so JSON.parse succeeds.
        const raw = (reader.result as string).replace(
          /\u201E([^\u201E\u201C\u201D\u0022\n]{1,200})"/g,
          "\u201E$1\u201C",
        );
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
          setImportStatus(shopsMessages.importInvalidFile);
          return;
        }
        const entries = parsed as Array<Record<string, unknown>>;
        importMutation.mutate(entries, {
          onSuccess: (result) => {
            setImportStatus(
              shopsMessages.importSuccess
                .replace("{imported}", String(result.imported))
                .replace("{skipped}", String(result.skipped)),
            );
          },
          onError: () => setImportStatus(shopsMessages.importError),
        });
      } catch {
        setImportStatus(shopsMessages.importInvalidFile);
      }
    };
    reader.readAsText(file);
  }

  function handleExport() {
    const rows = filtered
      .slice(0, exportLimit)
      .map((s) => ({ id: s.id, name: s.name, url: s.url }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shops-export-${rows.length}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <PageLayout>
      <PageHeader title={shopsMessages.title}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={shopsMessages.searchPlaceholder}
            className="py-1.5 w-52 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
            >
              <XCircleIcon weight="duotone" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <FilterDropdown
          value={geoFilter}
          onChange={setGeoFilter}
          options={geoFilterOptions}
        />

        <FilterDropdown
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={filterOptions}
        />

        <button
          type="button"
          onClick={() => {
            setImportStatus(null);
            importFileInputRef.current?.click();
          }}
          disabled={importMutation.isPending}
          className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)] transition-colors disabled:opacity-50"
          title={shopsMessages.importResults}
        >
          <UploadSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
          {shopsMessages.importResults}
        </button>
        <input
          ref={importFileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />

        <div className="flex items-center rounded-control border border-[var(--ds-border)] overflow-hidden">
          <select
            value={exportLimit}
            onChange={(e) => setExportLimit(Number(e.target.value) as ExportLimit)}
            className="py-1.5 pl-3 pr-1 text-sm bg-[var(--ds-surface)] text-[var(--ds-text)] focus:outline-none border-r border-[var(--ds-border)]"
            aria-label="Anzahl zu exportierender Shops"
          >
            {EXPORT_LIMITS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 py-1.5 px-3 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-surface-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={`${Math.min(exportLimit, filtered.length)} Shops als JSON exportieren`}
          >
            <DownloadSimpleIcon weight="duotone" className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>

      </PageHeader>

      {importStatus && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] text-sm text-[var(--ds-text-muted)]">
          {importStatus}
        </div>
      )}

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
    </PageLayout>
  );
}
