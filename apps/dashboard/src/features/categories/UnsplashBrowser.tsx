import { useI18n } from "@/context/I18nContext.tsx";
import { api } from "@/lib/api.ts";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { SFArrowClockwise, SFMagnifyingglass, SFXmark } from "sf-symbols-lib/monochrome";

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

interface UnsplashBrowserProps {
  defaultQuery?: string;
  onSelect: (imageUrl: string, photographer: string, photographerUrl: string) => void;
  onClose: () => void;
}

interface SearchState {
  query: string;
  photos: UnsplashPhoto[];
  total: number;
  page: number;
  status: "idle" | "loading" | "loading-more" | "error";
  error: string | null;
}

type SearchAction =
  | { type: "set-query"; query: string }
  | { type: "search-start" }
  | { type: "load-more-start" }
  | { type: "search-success"; photos: UnsplashPhoto[]; total: number; append: boolean }
  | { type: "search-error"; error: string; append: boolean }
  | { type: "next-page" };

/**
 * Reducer for Unsplash search/pagination state machine.
 *
 * @param state - Current state snapshot.
 * @param action - Transition action.
 * @returns Next state snapshot.
 */
function reducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "set-query":
      return { ...state, query: action.query, page: 1 };
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
 * Unsplash asset browser used in category image selection.
 *
 * Hidden behavior: debounces query changes, supports infinite scrolling and
 * triggers Unsplash download tracking when an image is selected.
 *
 * @param props - Initial query, selection callback and close handler.
 * @returns Full-screen media picker overlay.
 */
export function UnsplashBrowser({ defaultQuery = "", onSelect, onClose }: UnsplashBrowserProps) {
  const { messages } = useI18n();
  const categoriesMessages = messages.categories;
  const common = messages.common;
  const [state, dispatch] = useReducer(reducer, {
    query: defaultQuery,
    photos: [],
    total: 0,
    page: 1,
    status: "idle",
    error: null,
  });

  const { query, photos, total, status, error } = state;

  // Ref to avoid stale closures in IntersectionObserver
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string, pg: number, append: boolean) => {
      if (!q.trim()) {
        dispatch({ type: "search-success", photos: [], total: 0, append: false });
        return;
      }
      dispatch(append ? { type: "load-more-start" } : { type: "search-start" });
      try {
        const result = await api.get<UnsplashSearchResult>(
          `/admin/unsplash/search?q=${encodeURIComponent(q)}&page=${pg}`,
        );
        dispatch({ type: "search-success", photos: result.results, total: result.total, append });
      } catch (e) {
        dispatch({
          type: "search-error",
          error: e instanceof Error ? e.message : categoriesMessages.unsplash.searchError,
          append,
        });
      }
    },
    [categoriesMessages.unsplash.searchError],
  );

  // First run: search immediately (no debounce). Subsequent changes: debounced + reset page.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (query.trim()) search(query, 1, false);
      return;
    }
    dispatch({ type: "set-query", query });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, 1, false), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Infinite scroll: observe sentinel div at the bottom of the list
  const hasMore = photos.length > 0 && photos.length < total;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const { status: s, page: p, query: q } = stateRef.current;
        if (entries[0].isIntersecting && s !== "loading-more") {
          const nextPage = p + 1;
          dispatch({ type: "next-page" });
          search(q, nextPage, true);
        }
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSelect(photo: UnsplashPhoto) {
    api
      .post("/admin/unsplash/download", { downloadLocation: photo.downloadLocation })
      .catch(() => {});
    onSelect(photo.urls.regular, photo.user.name, photo.user.link);
  }

  const isLoading = status === "loading";
  const isLoadingMore = status === "loading-more";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl flex flex-col overflow-hidden overlay-card-enter"
        style={{ width: "85vw", height: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border-subtle)] shrink-0">
          <div className="relative flex-1">
            <SFMagnifyingglass className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] w-3.5 h-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => dispatch({ type: "set-query", query: e.target.value })}
              placeholder={categoriesMessages.unsplash.searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--ds-border)] rounded-control focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] transition-colors rounded-control hover:bg-[var(--ds-bg-elevated)]"
            aria-label={categoriesMessages.unsplash.closeAria}
          >
            <SFXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
          {!query.trim() && (
            <p className="text-center text-sm text-[var(--ds-text-subtle)] py-12">
              {categoriesMessages.unsplash.searchHint}
            </p>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <SFArrowClockwise className="w-6 h-6 text-[var(--ds-text-subtle)] animate-spin" />
            </div>
          )}

          {error && <p className="text-center text-sm text-red-500 py-12">{error}</p>}

          {!isLoading && !error && photos.length === 0 && query.trim() && (
            <p className="text-center text-sm text-[var(--ds-text-subtle)] py-12">
              {categoriesMessages.unsplash.emptyPrefix} „{query}"
            </p>
          )}

          {!isLoading && photos.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelect(photo)}
                    className="group relative aspect-video overflow-hidden rounded-control bg-[var(--ds-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    title={`${categoriesMessages.unsplash.addTitlePrefix} ${photo.user.name}`}
                  >
                    <img
                      src={photo.urls.small}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] truncate">{photo.user.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Sentinel for infinite scroll – spinner visible while loading more */}
              <div ref={sentinelRef} className="flex justify-center py-4">
                {isLoadingMore && (
                  <span title={common.loading} aria-label={common.loading}>
                    <SFArrowClockwise className="w-5 h-5 text-[var(--ds-text-subtle)] animate-spin" />
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
