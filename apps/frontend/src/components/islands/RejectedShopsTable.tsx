import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  PublicRejectedShopPageSize,
  PublicRejectedShopSortDirection,
  PublicRejectedShopSortField,
  PublicRejectedShopsResponse,
} from "@lmaa/contracts";

import { fetchJson } from "@/lib/fetch-json";

const PAGE_SIZE_OPTIONS: Array<{ value: PublicRejectedShopPageSize; label: string }> = [
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "20", label: "20" },
  { value: "30", label: "30" },
  { value: "50", label: "50" },
  { value: "all", label: "Alle" },
];

const SORT_LABELS: Record<PublicRejectedShopSortField, string> = {
  shopName: "Shop",
  submittedAt: "Einreichung",
  rejectedAt: "Ablehnung",
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface RejectedShopsTableProps {
  defaultPageSize: PublicRejectedShopPageSize;
  initialData: PublicRejectedShopsResponse;
  storageKey: string;
}

interface RejectedShopsTableState {
  page: number;
  pageSize: PublicRejectedShopPageSize;
  search: string;
  sortBy: PublicRejectedShopSortField;
  sortDir: PublicRejectedShopSortDirection;
}

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

function getDefaultState(defaultPageSize: PublicRejectedShopPageSize): RejectedShopsTableState {
  return {
    page: 1,
    pageSize: defaultPageSize,
    search: "",
    sortBy: "rejectedAt",
    sortDir: "desc",
  };
}

function isPageSize(value: unknown): value is PublicRejectedShopPageSize {
  return PAGE_SIZE_OPTIONS.some((option) => option.value === value);
}

function isSortBy(value: unknown): value is PublicRejectedShopSortField {
  return value === "shopName" || value === "submittedAt" || value === "rejectedAt";
}

function isSortDir(value: unknown): value is PublicRejectedShopSortDirection {
  return value === "asc" || value === "desc";
}

function loadPersistedState(
  key: string,
  defaultPageSize: PublicRejectedShopPageSize,
): RejectedShopsTableState {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as Partial<RejectedShopsTableState> | null;
    const fallback = getDefaultState(defaultPageSize);
    if (!parsed || typeof parsed !== "object") return fallback;
    const page = parsed.page;
    return {
      page: typeof page === "number" && Number.isInteger(page) && page > 0 ? page : fallback.page,
      pageSize: isPageSize(parsed.pageSize) ? parsed.pageSize : fallback.pageSize,
      search: typeof parsed.search === "string" ? parsed.search.slice(0, 200) : fallback.search,
      sortBy: isSortBy(parsed.sortBy) ? parsed.sortBy : fallback.sortBy,
      sortDir: isSortDir(parsed.sortDir) ? parsed.sortDir : fallback.sortDir,
    };
  } catch {
    return getDefaultState(defaultPageSize);
  }
}

function persistState(key: string, state: RejectedShopsTableState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Browser storage can be unavailable in private modes.
  }
}

function buildRejectedShopsPath(state: RejectedShopsTableState) {
  const params = new URLSearchParams({
    page: String(state.page),
    pageSize: state.pageSize,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
  });
  if (state.search.trim()) params.set("q", state.search.trim());
  return `/rejected-shops?${params}`;
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getNextSortDirection(
  current: RejectedShopsTableState,
  field: PublicRejectedShopSortField,
): PublicRejectedShopSortDirection {
  if (current.sortBy === field) return current.sortDir === "asc" ? "desc" : "asc";
  return field === "shopName" ? "asc" : "desc";
}

export default function RejectedShopsTable({
  defaultPageSize,
  initialData,
  storageKey,
}: RejectedShopsTableProps) {
  const storageId = `lmaa:rejected-shops-table:${storageKey}`;
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [state, setState] = useState<RejectedShopsTableState>(() =>
    getDefaultState(defaultPageSize),
  );
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState<PublicRejectedShopsResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = useMemo(() => {
    if (data.pageSize === "all") return 1;
    return Math.max(1, Math.ceil(data.total / Number(data.pageSize)));
  }, [data.pageSize, data.total]);

  useEffect(() => {
    const persisted = loadPersistedState(storageId, defaultPageSize);
    setState(persisted);
    setSearchInput(persisted.search);
    setHasLoadedPreferences(true);
  }, [defaultPageSize, storageId]);

  useEffect(() => {
    if (!hasLoadedPreferences) return;
    persistState(storageId, state);

    const controller = new AbortController();
    setIsLoading(true);
    fetchJson<PublicRejectedShopsResponse>(buildRejectedShopsPath(state), {
      signal: controller.signal,
    })
      .then((nextData) => {
        setData(nextData);
        if (nextData.page !== state.page) {
          setState((current) => ({ ...current, page: nextData.page }));
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Keep the last known data visible on transient API errors.
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [hasLoadedPreferences, state, storageId]);

  function updateState(patch: Partial<RejectedShopsTableState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function submitSearch(event: FormSubmitEvent) {
    event.preventDefault();
    updateState({ search: searchInput.trim(), page: 1 });
  }

  function clearSearch() {
    setSearchInput("");
    updateState({ search: "", page: 1 });
  }

  function sortBy(field: PublicRejectedShopSortField) {
    setState((current) => ({
      ...current,
      sortBy: field,
      sortDir: getNextSortDirection(current, field),
      page: 1,
    }));
  }

  return (
    <section className="my-10 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Abgelehnte Shops" value={data.metrics.totalRejectedShops} />
        <MetricCard label="Treffer" value={data.metrics.filteredRejectedShops} />
        <MetricCard
          label="Aktuelle Seite"
          value={data.pageSize === "all" ? "Alle" : `${data.page} / ${totalPages}`}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label
            htmlFor={`${storageKey}-rejected-shops-search`}
            className="text-sm font-medium text-stone-700"
          >
            Abgelehnte Shops suchen
          </label>
          <div className="flex gap-2">
            <input
              id={`${storageKey}-rejected-shops-search`}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              placeholder="Shop-Name…"
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-500/30"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <MagnifyingGlassIcon weight="duotone" className="size-4" />
              Suchen
            </button>
            {state.search ? (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                Zurücksetzen
              </button>
            ) : null}
          </div>
        </form>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
          Einträge pro Seite
          <select
            value={state.pageSize}
            onChange={(event) =>
              updateState({
                pageSize: event.currentTarget.value as PublicRejectedShopPageSize,
                page: 1,
              })
            }
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-500/30"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <SortableHeader field="shopName" state={state} onSort={sortBy} />
              <SortableHeader field="submittedAt" state={state} onSort={sortBy} />
              <SortableHeader field="rejectedAt" state={state} onSort={sortBy} />
              <th scope="col" className="px-3 py-3 text-right">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {data.entries.map((entry) => (
              <tr key={entry.id} className="transition hover:bg-stone-50">
                <td className="max-w-[18rem] px-3 py-3 font-medium text-stone-900">
                  <span className="block truncate" title={entry.shopName}>
                    {entry.shopName}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-stone-600">
                  {formatDate(entry.submittedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-stone-600">
                  {formatDate(entry.rejectedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <a
                    href={entry.rejectionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-amber-500 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    Öffnen
                    <ArrowSquareOutIcon weight="duotone" className="size-3.5" />
                  </a>
                </td>
              </tr>
            ))}
            {data.entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-sm text-stone-500">
                  Keine abgelehnten Shops gefunden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite">
          {isLoading
            ? "Lade…"
            : data.total === 0
              ? "Keine Einträge"
              : `${data.entries.length} von ${data.total} Einträgen angezeigt`}
        </p>
        {data.pageSize !== "all" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1 || isLoading}
              onClick={() => updateState({ page: Math.max(1, data.page - 1) })}
              className="rounded-xl border border-stone-300 px-3 py-2 font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:pointer-events-none disabled:opacity-40"
            >
              Zurück
            </button>
            <span>
              Seite {data.page} von {totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= totalPages || isLoading}
              onClick={() => updateState({ page: Math.min(totalPages, data.page + 1) })}
              className="rounded-xl border border-stone-300 px-3 py-2 font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:pointer-events-none disabled:opacity-40"
            >
              Weiter
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function SortableHeader({
  field,
  state,
  onSort,
}: {
  field: PublicRejectedShopSortField;
  state: RejectedShopsTableState;
  onSort: (field: PublicRejectedShopSortField) => void;
}) {
  const isActive = state.sortBy === field;
  const ariaSort = isActive ? (state.sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <th scope="col" aria-sort={ariaSort} className="px-3 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-left transition hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      >
        {SORT_LABELS[field]}
        {isActive ? (
          state.sortDir === "asc" ? (
            <CaretUpIcon weight="bold" className="size-3.5" />
          ) : (
            <CaretDownIcon weight="bold" className="size-3.5" />
          )
        ) : null}
      </button>
    </th>
  );
}
