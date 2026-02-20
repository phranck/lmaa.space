import type { Shop } from "@dein-shop/shared";

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  const domain = (() => {
    try {
      return new URL(shop.url).hostname.replace("www.", "");
    } catch {
      return shop.url;
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{shop.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{domain}</p>
        </div>
        <a
          href={shop.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium hover:bg-[var(--color-primary-light)] transition-colors"
        >
          Zum Shop →
        </a>
      </div>

      {shop.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{shop.description}</p>
      )}

      {/* Region / Shipping tags */}
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
                  className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium"
                >
                  {r}
                </span>
              ))}
          {shop.shipping && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              Versand: {shop.shipping}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
