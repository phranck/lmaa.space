import { ArrowClockwiseIcon, CheckCircleIcon, MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { api } from "@/lib/api.ts";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; link: string };
  downloadLocation: string;
}

interface UnsplashSearchResult {
  results: UnsplashPhoto[];
  total: number;
}

export interface UnsplashSelectedPhoto {
  url: string;
  photographer: string;
  photographerUrl: string;
  downloadLocation: string;
}

export interface UnsplashBrowserProps {
  defaultQuery?: string;
  onSelect: (photo: UnsplashSelectedPhoto) => void;
  onSelectMultiple?: (photos: UnsplashSelectedPhoto[]) => void;
  onClose: () => void;
}

interface SearchState {
  query: string;
  photos: UnsplashPhoto[];
  total: number;
  page: number;
  status: "idle" | "loading" | "loading-more" | "error";
  error: string | null;
  orientation: string;
  orderBy: string;
  color: string;
}

type SearchAction =
  | { type: "set-query"; query: string }
  | { type: "set-orientation"; orientation: string }
  | { type: "set-order-by"; orderBy: string }
  | { type: "set-color"; color: string }
  | { type: "search-start" }
  | { type: "load-more-start" }
  | { type: "search-success"; photos: UnsplashPhoto[]; total: number; append: boolean }
  | { type: "search-error"; error: string; append: boolean }
  | { type: "next-page" };

type UnsplashColorValue =
  | "black_and_white"
  | "black"
  | "white"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "magenta"
  | "green"
  | "teal"
  | "blue";

type ColorLabelKey =
  | "colorBlackAndWhite"
  | "colorBlack"
  | "colorWhite"
  | "colorYellow"
  | "colorOrange"
  | "colorRed"
  | "colorPurple"
  | "colorMagenta"
  | "colorGreen"
  | "colorTeal"
  | "colorBlue";

const COLORS: { value: UnsplashColorValue; css: string; labelKey: ColorLabelKey }[] = [
  { value: "black_and_white", css: "linear-gradient(135deg, #1a1a1a 50%, #f5f5f5 50%)", labelKey: "colorBlackAndWhite" },
  { value: "black", css: "#1a1a1a", labelKey: "colorBlack" },
  { value: "white", css: "#f0f0f0", labelKey: "colorWhite" },
  { value: "yellow", css: "#facc15", labelKey: "colorYellow" },
  { value: "orange", css: "#f97316", labelKey: "colorOrange" },
  { value: "red", css: "#ef4444", labelKey: "colorRed" },
  { value: "purple", css: "#a855f7", labelKey: "colorPurple" },
  { value: "magenta", css: "#ec4899", labelKey: "colorMagenta" },
  { value: "green", css: "#22c55e", labelKey: "colorGreen" },
  { value: "teal", css: "#14b8a6", labelKey: "colorTeal" },
  { value: "blue", css: "#3b82f6", labelKey: "colorBlue" },
];

function reducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "set-query":
      return { ...state, query: action.query, page: 1 };
    case "set-orientation":
      return { ...state, orientation: action.orientation, page: 1 };
    case "set-order-by":
      return { ...state, orderBy: action.orderBy, page: 1 };
    case "set-color":
      return { ...state, color: action.color, page: 1 };
    case "search-start":
      return { ...state, status: "loading", error: null };
    case "load-more-start":
      return { ...state, status: "loading-more", error: null };
    case "search-success":
      return {
        ...state,
        status: "idle",
        photos: action.append ? [...state.photos, ...action.photos] : action.photos,
        total: action.total,
      };
    case "search-error":
      return {
        ...state,
        status: "error",
        error: action.error,
        photos: action.append ? state.photos : [],
      };
    case "next-page":
      return { ...state, page: state.page + 1 };
  }
}

/**
 * Shared Unsplash asset browser for admin UI.
 *
 * Supports filtering by orientation, sort order, and dominant color.
 * Debounces query changes, supports infinite scrolling, triggers Unsplash
 * download tracking and calls `onSelect` with a full photo object.
 *
 * @param props - Initial query, selection callback and close handler.
 * @returns Full-screen media picker overlay.
 */
export function UnsplashBrowser({ defaultQuery = "", onSelect, onSelectMultiple, onClose }: UnsplashBrowserProps) {
  const { messages } = useI18n();
  const categoriesMessages = messages.categories;
  const common = messages.common;
  const unsplash = categoriesMessages.unsplash;

  const [state, dispatch] = useReducer(reducer, {
    query: defaultQuery,
    photos: [],
    total: 0,
    page: 1,
    status: "idle",
    error: null,
    orientation: "",
    orderBy: "",
    color: "",
  });

  const { query, photos, total, status, error, orientation, orderBy, color } = state;

  const multiSelect = onSelectMultiple !== undefined;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string, pg: number, append: boolean, ori: string, order: string, col: string) => {
      if (!q.trim()) {
        dispatch({ type: "search-success", photos: [], total: 0, append: false });
        return;
      }
      dispatch(append ? { type: "load-more-start" } : { type: "search-start" });
      try {
        const params = new URLSearchParams({ q, page: String(pg) });
        if (ori) params.set("orientation", ori);
        if (order) params.set("order_by", order);
        if (col) params.set("color", col);
        const result = await api.get<UnsplashSearchResult>(
          `/admin/unsplash/search?${params.toString()}`,
        );
        dispatch({ type: "search-success", photos: result.results, total: result.total, append });
      } catch (e) {
        dispatch({
          type: "search-error",
          error: e instanceof Error ? e.message : unsplash.searchError,
          append,
        });
      } finally {
        if (append) loadingMoreRef.current = false;
      }
    },
    [unsplash.searchError],
  );

  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: searchRef stays current via its own effect
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (query.trim()) {
        const { orientation: o, orderBy: ob, color: c } = stateRef.current;
        search(query, 1, false, o, ob, c);
      }
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const { query: q, orientation: o, orderBy: ob, color: c } = stateRef.current;
      search(q, 1, false, o, ob, c);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, orientation, orderBy, color]);

  const hasMore = photos.length > 0 && photos.length < total;
  // biome-ignore lint/correctness/useExhaustiveDependencies: photos.length triggers re-observe after append
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loadingMoreRef.current) return;
        const { page: p, query: q, orientation: o, orderBy: ob, color: c } = stateRef.current;
        loadingMoreRef.current = true;
        dispatch({ type: "next-page" });
        searchRef.current(q, p + 1, true, o, ob, c);
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, photos.length]);

  function handlePhotoClick(photo: UnsplashPhoto) {
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(photo.id)) {
          next.delete(photo.id);
        } else {
          next.add(photo.id);
        }
        return next;
      });
    } else {
      api
        .post("/admin/unsplash/download", { downloadLocation: photo.downloadLocation })
        .catch(() => {});
      onSelect({
        url: photo.urls.regular,
        photographer: photo.user.name,
        photographerUrl: photo.user.link,
        downloadLocation: photo.downloadLocation,
      });
    }
  }

  function handleConfirmMultiSelect() {
    if (!onSelectMultiple) return;
    const selected = photos.filter((p) => selectedIds.has(p.id));
    for (const photo of selected) {
      api
        .post("/admin/unsplash/download", { downloadLocation: photo.downloadLocation })
        .catch(() => {});
    }
    onSelectMultiple(
      selected.map((p) => ({
        url: p.urls.regular,
        photographer: p.user.name,
        photographerUrl: p.user.link,
        downloadLocation: p.downloadLocation,
      })),
    );
  }

  const isLoading = status === "loading";
  const isLoadingMore = status === "loading-more";

  const chipClass = (active: boolean) =>
    `px-2 py-0.5 text-xs rounded border transition-colors ${
      active
        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
        : "border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]"
    }`;

  return (
    <OverlayCard
      open
      onClose={onClose}
      size="fullscreen"
      aria-label={categoriesMessages.editCard.unsplash}
    >
      {/* Search header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border-subtle)] shrink-0">
        <div className="relative flex-1">
          <MagnifyingGlassIcon
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] w-3.5 h-3.5"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => dispatch({ type: "set-query", query: e.target.value })}
            placeholder={unsplash.searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--ds-border)] rounded-control focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] rounded-control hover:bg-[var(--ds-bg-elevated)]"
          aria-label={unsplash.closeAria}
        >
          <XCircleIcon weight="duotone" className="w-5 h-5" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--ds-border-subtle)] shrink-0 flex-wrap">
        <div className="flex items-center gap-1">
          {(
            [
              { value: "", label: unsplash.orientationAll },
              { value: "landscape", label: unsplash.orientationLandscape },
              { value: "portrait", label: unsplash.orientationPortrait },
              { value: "squarish", label: unsplash.orientationSquarish },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => dispatch({ type: "set-orientation", orientation: value })}
              className={chipClass(orientation === value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--ds-border-subtle)] shrink-0" />

        <div className="flex items-center gap-1">
          {(
            [
              { value: "", label: unsplash.orderByRelevant },
              { value: "latest", label: unsplash.orderByLatest },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value || "relevant"}
              type="button"
              onClick={() => dispatch({ type: "set-order-by", orderBy: value })}
              className={chipClass(orderBy === value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--ds-border-subtle)] shrink-0" />

        <div className="flex items-center gap-1.5" aria-label={unsplash.filterColor}>
          {COLORS.map(({ value, css, labelKey }) => {
            const label = unsplash[labelKey];
            const isActive = color === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => dispatch({ type: "set-color", color: isActive ? "" : value })}
                className={`w-4.5 h-4.5 rounded-full border transition-all ${
                  isActive
                    ? "ring-2 ring-offset-1 ring-[var(--color-primary)] scale-110 border-transparent"
                    : "border-[var(--ds-border)] opacity-80 hover:opacity-100 hover:scale-110"
                }`}
                style={{ background: css }}
                aria-label={label}
                title={label}
              />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {!query.trim() && (
          <p className="text-center text-sm text-[var(--ds-text-subtle)] py-12">
            {unsplash.searchHint}
          </p>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <ArrowClockwiseIcon
              weight="duotone"
              className="w-6 h-6 text-[var(--ds-text-subtle)] animate-spin"
            />
          </div>
        )}

        {error && <p className="text-center text-sm text-red-500 py-12">{error}</p>}

        {!isLoading && !error && photos.length === 0 && query.trim() && (
          <p className="text-center text-sm text-[var(--ds-text-subtle)] py-12">
            {unsplash.emptyPrefix} &bdquo;{query}&ldquo;
          </p>
        )}

        {!isLoading && photos.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo) => {
                const isSelected = selectedIds.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handlePhotoClick(photo)}
                    className={`group relative aspect-video overflow-hidden rounded-control bg-[var(--ds-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      isSelected ? "ring-2 ring-[var(--color-primary)]" : ""
                    }`}
                    title={`${unsplash.addTitlePrefix} ${photo.user.name}`}
                  >
                    <img
                      src={photo.urls.small}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 bg-[var(--color-primary)] rounded-full p-0.5">
                        <CheckCircleIcon weight="fill" className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] truncate">{photo.user.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="flex justify-center py-4">
              {isLoadingMore && (
                <span title={common.loading} aria-label={common.loading}>
                  <ArrowClockwiseIcon
                    weight="duotone"
                    className="w-5 h-5 text-[var(--ds-text-subtle)] animate-spin"
                  />
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Multi-select action bar */}
      {multiSelect && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--ds-border-subtle)] shrink-0">
          <span className="text-sm text-[var(--ds-text-muted)]">
            {selectedIds.size > 0
              ? `${selectedIds.size} ${unsplash.selectedCount}`
              : ""}
          </span>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={handleConfirmMultiSelect}
            className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control hover:bg-[var(--ds-btn-primary-hover-bg)] hover:border-[var(--ds-btn-primary-hover-border)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {unsplash.addSelected}
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </button>
        </div>
      )}
    </OverlayCard>
  );
}
