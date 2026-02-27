import { API_BASE } from "@/lib/client-api";
import { renderMarkdown } from "@/lib/markdown";
import { shopDomain, shopRefUrl } from "@/lib/shop";
import { REGION_CODES, type Shop } from "@lmaa/shared";
import { useEffect, useState } from "react";

interface Props {
  slug: string;
}

interface CategoryData {
  name: string;
  imageUrl: string | null;
  shops: Array<Shop & { descriptionHtml: string | null }>;
}

const BACKEND_ORIGIN = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

function slugToTitle(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

type State =
  | { type: "loading" }
  | { type: "ready"; data: CategoryData; isFallback: boolean }
  | { type: "not_found" };

export default function CategoryPage({ slug }: Props) {
  const [state, setState] = useState<State>({ type: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let isFallback = false;
      let rawData: { name: string; imageUrl?: string | null; shops: Shop[] } | null = null;

      try {
        const res = await fetch(`${API_BASE}/categories/${slug}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        rawData = json.data as { name: string; imageUrl?: string | null; shops: Shop[] };
      } catch {
        isFallback = true;
        rawData = { name: slugToTitle(slug), imageUrl: null, shops: [] };
      }

      if (cancelled || !rawData) return;

      const shops = await Promise.all(
        rawData.shops.map(async (shop) => ({
          ...shop,
          descriptionHtml: shop.description ? await renderMarkdown(shop.description) : null,
        })),
      );

      if (!cancelled) {
        setState({
          type: "ready",
          data: { name: rawData.name, imageUrl: rawData.imageUrl ?? null, shops },
          isFallback,
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.type === "loading") {
    return (
      <>
        <div className="relative h-52 sm:h-64 bg-stone-200 animate-pulse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-stone-100 rounded-3xl h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (state.type === "not_found") {
    window.location.replace("/404");
    return null;
  }

  const { data, isFallback } = state;
  const imageUrl = resolveImageUrl(data.imageUrl) ?? `/images/${slug}.jpg`;
  const shopCount = data.shops.length;

  return (
    <>
      {/* Hero Banner */}
      <div className="relative h-52 sm:h-64 overflow-hidden">
        <img src={imageUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-stone-900/65" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 sm:px-10 pb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-white">{data.name}</h1>
          <p className="text-stone-300 text-sm mt-1">
            {shopCount} {shopCount === 1 ? "Shop" : "Shops"} in dieser Kategorie
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-sm text-stone-400 mb-8"
          aria-label="Breadcrumb"
        >
          <a href="/" className="hover:text-amber-700 transition-colors">
            Start
          </a>
          <span className="text-stone-300" aria-hidden="true">
            ›
          </span>
          <span className="text-stone-600">{data.name}</span>
        </nav>

        {data.shops.length === 0 ? (
          <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-100">
            {isFallback ? (
              <p className="text-stone-500">
                Kategorie-Inhalte sind gerade nicht erreichbar. Bitte in wenigen Minuten erneut
                laden.
              </p>
            ) : (
              <>
                <p className="text-stone-500 mb-5">Noch keine Shops in dieser Kategorie.</p>
                <a
                  href="/suggestion"
                  className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  Ersten Shop vorschlagen
                </a>
              </>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.shops.map((shop) => {
              const domain = shopDomain(shop.url);
              const visitUrl = shopRefUrl(shop.url);
              const sortedRegions = [...shop.region].sort(
                (a, b) => REGION_CODES.indexOf(a) - REGION_CODES.indexOf(b),
              );

              return (
                <div
                  key={shop.id}
                  className="bg-white rounded-3xl border border-stone-200 p-4 flex flex-col gap-3 hover:shadow-md hover:border-stone-300 transition-all duration-200"
                  data-shop-id={shop.id}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 flex items-center justify-center">
                      {shop.ogImage ? (
                        <img
                          src={shop.ogImage}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="w-full h-full object-cover"
                          data-img-fallback=""
                        />
                      ) : (
                        <span className="text-2xl font-bold text-stone-300 select-none">
                          {shop.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-stone-900 text-lg leading-snug">
                        {shop.name}
                      </h3>
                      <p className="text-sm text-stone-400 mt-0.5 truncate">{domain}</p>
                    </div>
                  </div>

                  {shop.descriptionHtml && (
                    <div
                      className="text-sm text-stone-600 leading-relaxed prose prose-sm prose-stone max-w-none prose-p:my-0 prose-a:text-amber-700"
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by renderMarkdown (strips HTML blocks, validates hrefs)
                      dangerouslySetInnerHTML={{ __html: shop.descriptionHtml }}
                    />
                  )}

                  {(sortedRegions.length > 0 || shop.shipping) && (
                    <div className="flex flex-wrap gap-1.5">
                      {sortedRegions.map((r) => (
                        <span
                          key={r}
                          className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100"
                        >
                          {r}
                        </span>
                      ))}
                      {shop.shipping && (
                        <span className="px-2.5 py-0.5 rounded-md bg-stone-50 text-stone-600 text-xs font-medium border border-stone-100">
                          Versand: {shop.shipping}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3" data-shop-actions="">
                      <button
                        type="button"
                        className="text-xs text-stone-400 hover:text-red-400 transition-colors"
                        data-action="dead-link"
                        data-shop-id={shop.id}
                        data-dialog={`dialog-dead-${shop.id}`}
                        aria-label={`Defekten Link für ${shop.name} melden`}
                      >
                        Link defekt?
                      </button>
                      <button
                        type="button"
                        className="text-xs text-stone-400 hover:text-red-400 transition-colors"
                        data-action="report"
                        data-shop-id={shop.id}
                        data-dialog={`dialog-report-${shop.id}`}
                        aria-label={`${shop.name} melden`}
                      >
                        Shop melden
                      </button>
                    </div>
                    <a
                      href={visitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors bg-[var(--accent-hover)] text-[var(--accent-text)] hover:bg-[var(--accent-active)]"
                    >
                      Besuchen ↗
                    </a>
                  </div>

                  {/* Dead link dialog */}
                  <dialog
                    id={`dialog-dead-${shop.id}`}
                    aria-modal="true"
                    className="bg-[var(--ds-surface)] rounded-[var(--ds-radius-3xl)] shadow-[var(--ds-shadow-xl)] w-full max-w-md p-6 m-auto"
                  >
                    <h2 className="font-serif text-xl font-semibold text-[var(--ds-text)] mb-1">
                      Link defekt?
                    </h2>
                    <p className="text-sm text-[var(--ds-text-muted)] mb-6">
                      Ist der Link von{" "}
                      <span className="font-medium text-[var(--ds-text)]">{shop.name}</span>{" "}
                      wirklich nicht mehr erreichbar?
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        className="h-9 px-4 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
                        data-dismiss=""
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="h-9 px-5 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
                        data-confirm="dead-link"
                        data-shop-id={shop.id}
                      >
                        Ja, Link melden
                      </button>
                    </div>
                  </dialog>

                  {/* Report dialog */}
                  <dialog
                    id={`dialog-report-${shop.id}`}
                    aria-modal="true"
                    className="bg-[var(--ds-surface)] rounded-[var(--ds-radius-3xl)] shadow-[var(--ds-shadow-xl)] w-full max-w-md p-6 m-auto"
                  >
                    <div data-report-form="">
                      <h2 className="font-serif text-xl font-semibold text-[var(--ds-text)] mb-1">
                        Shop melden
                      </h2>
                      <p className="text-sm text-[var(--ds-text-muted)] mb-5">
                        Du möchtest{" "}
                        <span className="font-medium text-[var(--ds-text)]">{shop.name}</span>{" "}
                        melden?
                      </p>
                      <div className="space-y-4">
                        <textarea
                          rows={4}
                          placeholder="z. B. Shop verkauft keine fairen Produkte, ist nicht mehr erreichbar, …"
                          className="w-full px-3 py-2.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                          data-reason-input=""
                        />
                        <p
                          className="text-[var(--ds-danger-text)] text-xs hidden"
                          data-error-msg=""
                        />
                        <div className="flex gap-3 justify-end">
                          <button
                            type="button"
                            className="h-9 px-4 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
                            data-dismiss=""
                          >
                            Abbrechen
                          </button>
                          <button
                            type="button"
                            className="h-9 px-5 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors disabled:opacity-50"
                            data-confirm="report"
                            data-shop-id={shop.id}
                          >
                            Melden
                          </button>
                        </div>
                      </div>
                    </div>
                    <div data-report-success="" className="text-center py-6 hidden">
                      <p className="text-2xl mb-3">🙏</p>
                      <h2 className="font-serif text-xl font-semibold text-[var(--ds-text)] mb-2">
                        Danke für deinen Hinweis!
                      </h2>
                      <p className="text-sm text-[var(--ds-text-muted)] mb-6">
                        Wir prüfen deine Meldung und handeln bei Bedarf.
                      </p>
                      <button
                        type="button"
                        className="h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
                        data-dismiss=""
                      >
                        Schließen
                      </button>
                    </div>
                  </dialog>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
