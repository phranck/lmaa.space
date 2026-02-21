import { useState, useEffect, useRef, useCallback } from "react";
import { LuX, LuSearch, LuLoader } from "react-icons/lu";
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

interface UnsplashBrowserProps {
  initialQuery?: string;
  onSelect: (imageUrl: string, photographer: string, photographerUrl: string) => void;
  onClose: () => void;
}

export function UnsplashBrowser({ initialQuery = "", onSelect, onClose }: UnsplashBrowserProps) {
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync so the IntersectionObserver callback doesn't close over stale state
  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const search = useCallback(async (q: string, pg: number, append: boolean) => {
    if (!q.trim()) {
      setPhotos([]);
      setTotal(0);
      return;
    }
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<UnsplashSearchResult>(
        `/admin/unsplash/search?q=${encodeURIComponent(q)}&page=${pg}`
      );
      setPhotos((prev) => append ? [...prev, ...result.results] : result.results);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler bei der Suche");
      if (!append) setPhotos([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // First run: search immediately (no debounce). Subsequent changes: debounced + reset page.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (query.trim()) search(query, 1, false);
      return;
    }
    setPage(1);
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
        if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
          const nextPage = pageRef.current + 1;
          setPage(nextPage);
          search(query, nextPage, true);
        }
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, query, search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSelect(photo: UnsplashPhoto) {
    api.post("/admin/unsplash/download", { downloadLocation: photo.downloadLocation }).catch(() => {});
    onSelect(photo.urls.regular, photo.user.name, photo.user.link);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-[var(--radius-card)] shadow-2xl flex flex-col overflow-hidden"
           style={{ width: "85vw", height: "85vh" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="relative flex-1">
            <LuSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchbegriff eingeben…"
              autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-control focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-control hover:bg-gray-100"
            aria-label="Schließen"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
          {!query.trim() && (
            <p className="text-center text-sm text-gray-400 py-12">
              Suchbegriff eingeben, um Bilder zu finden
            </p>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <LuLoader size={24} className="text-gray-400 animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-red-500 py-12">{error}</p>
          )}

          {!isLoading && !error && photos.length === 0 && query.trim() && (
            <p className="text-center text-sm text-gray-400 py-12">
              Keine Bilder gefunden für „{query}"
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
                    className="group relative aspect-video overflow-hidden rounded-control bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    title={`Foto von ${photo.user.name}`}
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
                {isLoadingMore && <LuLoader size={20} className="text-gray-400 animate-spin" />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
