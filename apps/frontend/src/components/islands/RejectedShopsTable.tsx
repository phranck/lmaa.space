import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useReducer, useState } from "react";

import type {
  PublicRejectedShopPageSize,
  PublicRejectedShopSortDirection,
  PublicRejectedShopSortField,
  PublicRejectedShopsResponse,
} from "@lmaa/contracts";
import { resolveLogoBackground } from "@lmaa/shared";

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

interface RejectedShopsTableDataState {
  data: PublicRejectedShopsResponse;
  isLoading: boolean;
  hasLoadError: boolean;
}

type RejectedShopsTableDataAction =
  | { type: "load" }
  | { type: "success"; data: PublicRejectedShopsResponse }
  | { type: "error" };

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

function dataReducer(
  current: RejectedShopsTableDataState,
  action: RejectedShopsTableDataAction,
): RejectedShopsTableDataState {
  switch (action.type) {
    case "load":
      return { ...current, isLoading: true, hasLoadError: false };
    case "success":
      return { data: action.data, isLoading: false, hasLoadError: false };
    case "error":
      return { ...current, isLoading: false, hasLoadError: true };
  }
}

function getDefaultState(defaultPageSize: PublicRejectedShopPageSize): RejectedShopsTableState {
  return {
    page: 1,
    pageSize: defaultPageSize,
    search: "",
    sortBy: "rejectedAt",
    sortDir: "desc",
  };
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

function ShopLogo({
  name,
  ogImage,
  logoBackgroundColor,
}: {
  name: string;
  ogImage: string | null;
  logoBackgroundColor: string | null;
}) {
  const letter = name.charAt(0).toUpperCase();

  return (
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-100"
      style={{ backgroundColor: resolveLogoBackground(logoBackgroundColor) }}
      aria-hidden="true"
    >
      {ogImage ? (
        <img
          src={ogImage}
          alt=""
          loading="lazy"
          width={28}
          height={28}
          className="block size-full object-contain"
        />
      ) : (
        <span className="flex size-full select-none items-center justify-center text-xs font-bold text-stone-300">
          {letter}
        </span>
      )}
    </span>
  );
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
  const defaultState = useMemo(() => getDefaultState(defaultPageSize), [defaultPageSize]);
  const [state, setState] = useState<RejectedShopsTableState>(defaultState);
  const [searchInput, setSearchInput] = useState(defaultState.search);
  const [{ data, isLoading, hasLoadError }, dispatchData] = useReducer(dataReducer, {
    data: initialData,
    isLoading: false,
    hasLoadError: false,
  });
  const requestPath = useMemo(() => buildRejectedShopsPath(state), [state]);

  const totalPages = useMemo(() => {
    if (data.pageSize === "all") return 1;
    return Math.max(1, Math.ceil(data.total / Number(data.pageSize)));
  }, [data.pageSize, data.total]);

  useEffect(() => {
    const controller = new AbortController();
    dispatchData({ type: "load" });

    void fetchJson<PublicRejectedShopsResponse>(requestPath, {
      signal: controller.signal,
    })
      .then((nextData) => {
        dispatchData({ type: "success", data: nextData });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          dispatchData({ type: "error" });
        }
      });
    return () => controller.abort();
  }, [requestPath]);

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

  function updatePage(page: number) {
    updateState({ page });
  }

  return (
    <section className="not-prose my-8">
      <p className="text-sm font-medium text-stone-600" aria-live="polite">
        {data.metrics.totalRejectedShops} abgelehnte Shops
        {state.search ? ` · ${data.metrics.filteredRejectedShops} Treffer` : ""}
      </p>
      {hasLoadError ? (
        <p className="mt-2 text-sm text-red-700" role="status">
          Die Tabelle konnte nicht aktualisiert werden.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          onSubmit={submitSearch}
          className="flex min-w-0 flex-1 gap-2"
          aria-label="Abgelehnte Shops suchen"
        >
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              id={`${storageKey}-rejected-shops-search`}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              aria-label="Abgelehnte Shops suchen"
              placeholder="Shop-Name…"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            />
            <button
              type="submit"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-[var(--ds-btn-filled-bg)] px-3 text-sm font-medium text-[var(--ds-btn-filled-fg)] transition-colors hover:bg-[var(--ds-btn-filled-hover)] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <MagnifyingGlassIcon weight="duotone" className="size-4" />
              Suchen
            </button>
            {state.search ? (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-[var(--ds-btn-neutral-border)] px-3 text-sm font-medium text-[var(--ds-btn-neutral-text)] transition-colors hover:border-[var(--ds-btn-neutral-hover-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <XCircleIcon weight="duotone" className="size-4" />
                Zurücksetzen
              </button>
            ) : null}
          </div>
        </form>

        <label className="flex items-center gap-2 text-sm text-stone-600">
          <span>Einträge pro Seite</span>
          <select
            value={state.pageSize}
            onChange={(event) =>
              updateState({
                pageSize: event.currentTarget.value as PublicRejectedShopPageSize,
                page: 1,
              })
            }
            className="h-8 rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-normal normal-case tracking-normal text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto border-y border-stone-200">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <SortableHeader field="shopName" state={state} onSort={sortBy} />
              <SortableHeader field="rejectedAt" state={state} onSort={sortBy} />
              <th scope="col" className="px-3 py-2 text-right">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry) => (
              <tr
                key={entry.id}
                className="transition odd:bg-white even:bg-stone-50/70 hover:bg-amber-50/50"
              >
                <td className="max-w-[20rem] px-3 py-1 align-middle font-medium text-stone-900">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ShopLogo
                      name={entry.shopName}
                      ogImage={entry.ogImage}
                      logoBackgroundColor={entry.logoBackgroundColor}
                    />
                    <span className="block truncate" title={entry.shopName}>
                      {entry.shopName}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-1 align-middle leading-none text-stone-600">
                  {formatDate(entry.rejectedAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-1 text-right align-middle">
                  <a
                    href={entry.rejectionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-control border border-[var(--ds-btn-neutral-border)] px-2.5 text-xs font-medium leading-none text-[var(--ds-btn-neutral-text)] no-underline transition-colors hover:border-[var(--ds-btn-neutral-hover-border)] hover:no-underline focus:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    style={{ textDecoration: "none" }}
                    aria-label={`${entry.shopName} öffnen`}
                    title="Öffnen"
                  >
                    <ArrowSquareOutIcon weight="duotone" className="size-4" />
                    Öffnen
                  </a>
                </td>
              </tr>
            ))}
            {data.entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-stone-500">
                  Keine abgelehnten Shops gefunden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite">
          {data.total === 0
            ? "Keine Einträge"
            : `${data.entries.length} von ${data.total} Einträgen angezeigt`}
        </p>
        {data.pageSize !== "all" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1 || isLoading}
              onClick={() => updatePage(Math.max(1, data.page - 1))}
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-[var(--ds-btn-neutral-border)] px-3 text-sm font-medium text-[var(--ds-btn-neutral-text)] transition-colors hover:border-[var(--ds-btn-neutral-hover-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:pointer-events-none disabled:opacity-40"
            >
              <CaretLeftIcon weight="bold" className="size-3.5" />
              Zurück
            </button>
            <span>{isLoading ? "Lade..." : `Seite ${data.page} von ${totalPages}`}</span>
            <button
              type="button"
              disabled={data.page >= totalPages || isLoading}
              onClick={() => updatePage(Math.min(totalPages, data.page + 1))}
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-[var(--ds-btn-neutral-border)] px-3 text-sm font-medium text-[var(--ds-btn-neutral-text)] transition-colors hover:border-[var(--ds-btn-neutral-hover-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:pointer-events-none disabled:opacity-40"
            >
              <CaretRightIcon weight="bold" className="size-3.5" />
              Weiter
            </button>
          </div>
        ) : null}
      </div>
    </section>
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
    <th scope="col" aria-sort={ariaSort} className="px-3 py-2">
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
