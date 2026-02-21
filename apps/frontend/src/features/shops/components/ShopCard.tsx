import { useState } from "react";
import type { Shop } from "@dein-shop/shared";
import { api } from "../../../lib/api.ts";

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const domain = (() => {
    try {
      return new URL(shop.url).hostname.replace("www.", "");
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
              className="w-full h-full object-contain p-1"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-2xl font-bold text-stone-300 select-none">
              {shop.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + domain + button */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-stone-900 text-lg leading-snug">
              {shop.name}
            </h3>
            <p className="text-sm text-stone-400 mt-0.5 truncate">{domain}</p>
          </div>
          <a
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: "var(--accent-base)",
              color: "var(--accent-text)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--accent-hover)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--accent-base)")}
          >
            Besuchen ↗
          </a>
        </div>
      </div>

      {shop.description && (
        <p className="text-sm text-stone-600 leading-relaxed">{shop.description}</p>
      )}

      {(shop.region || shop.shipping) && (
        <div className="flex flex-wrap gap-1.5">
          {shop.region &&
            shop.region
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean)
              .map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100"
                >
                  {r}
                </span>
              ))}
          {shop.shipping && (
            <span className="px-2.5 py-0.5 rounded-full bg-stone-50 text-stone-600 text-xs font-medium border border-stone-100">
              Versand: {shop.shipping}
            </span>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1 border-t border-stone-100 mt-auto">
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
      </div>
    </div>
  );
}
