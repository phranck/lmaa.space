import { api } from "@/lib/api.ts";
import type { Shop } from "@lmaa/shared";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ReportShopCard } from "./ReportShopCard.tsx";

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showConcernModal, setShowConcernModal] = useState(false);

  const domain = (() => {
    try {
      return new URL(shop.url).hostname.replace("www.", "");
    } catch {
      return shop.url;
    }
  })();

  const shopUrl = (() => {
    try {
      const u = new URL(shop.url);
      u.searchParams.set("ref", "lmaa.space");
      return u.toString();
    } catch {
      return shop.url;
    }
  })();

  async function handleReport() {
    setReporting(true);
    try {
      await api.post(`/shops/${shop.id}/report`, {});
      setReported(true);
    } catch {
      setReported(true);
    } finally {
      setReporting(false);
    }
  }

  return (
    <>
    <div className="bg-white rounded-3xl border border-stone-200 p-4 flex flex-col gap-3 hover:shadow-md hover:border-stone-300 transition-all duration-200">
      {/* Top row: logo + name + button */}
      <div className="flex items-start gap-4">
        {/* Website og:image preview */}
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 flex items-center justify-center">
          {shop.ogImage && !imgError ? (
            <img
              src={shop.ogImage}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-2xl font-bold text-stone-300 select-none">
              {shop.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + domain */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-stone-900 text-lg leading-snug">
            {shop.name}
          </h3>
          <p className="text-sm text-stone-400 mt-0.5 truncate">{domain}</p>
        </div>
      </div>

      {shop.description && (
        <div className="text-sm text-stone-600 leading-relaxed prose prose-sm prose-stone max-w-none prose-p:my-0 prose-a:text-amber-700">
          <ReactMarkdown>{shop.description}</ReactMarkdown>
        </div>
      )}

      {(shop.region.length > 0 || shop.shipping) && (
        <div className="flex flex-wrap gap-1.5">
          {[...shop.region].sort((a, b) => ["DE", "AT", "CH", "EU"].indexOf(a) - ["DE", "AT", "CH", "EU"].indexOf(b)).map((r) => (
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

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3">
          {reported ? (
            <span className="text-xs text-stone-400">Danke für deinen Hinweis!</span>
          ) : (
            <button
              type="button"
              onClick={handleReport}
              disabled={reporting}
              className="text-xs text-stone-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              Link defekt?
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowConcernModal(true)}
            className="text-xs text-stone-400 hover:text-red-400 transition-colors"
          >
            Shop melden
          </button>
        </div>
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors bg-[var(--accent-hover)] text-[var(--accent-text)] hover:bg-[var(--accent-active)]"
        >
          Besuchen ↗
        </a>
      </div>
    </div>

    {showConcernModal && (
      <ReportShopCard
        shopId={shop.id}
        shopName={shop.name}
        onClose={() => setShowConcernModal(false)}
      />
    )}
    </>
  );
}
