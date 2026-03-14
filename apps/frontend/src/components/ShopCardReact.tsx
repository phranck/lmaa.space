import { MapPinLineIcon } from "@phosphor-icons/react";

import { shopDomain } from "@/lib/shop";

interface ShopCategory {
  id: number;
  name: string;
  slug: string;
}

interface ShopCardProps {
  name: string;
  ogImage?: string | null;
  url: string;
  categories?: ShopCategory[];
  detailHref: string;
  hasCoordinates?: boolean;
}

const MAX_PILLS = 2;

export default function ShopCardReact({
  name,
  ogImage,
  url,
  categories,
  detailHref,
  hasCoordinates = false,
}: ShopCardProps) {
  const domain = shopDomain(url);
  const letter = name.charAt(0).toUpperCase();
  const visibleCategories = categories?.slice(0, MAX_PILLS) ?? [];
  const extraCount = (categories?.length ?? 0) - MAX_PILLS;

  return (
    <a
      href={detailHref}
      className="relative block bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 hover:shadow-md hover:border-stone-300 transition-all duration-200"
    >
      {hasCoordinates && (
        <span
          className="absolute top-2 right-2 text-stone-300"
          title="Standort verfügbar"
        >
          <MapPinLineIcon weight="duotone" className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-stone-100 bg-stone-50 flex items-center justify-center">
          {ogImage ? (
            <img
              src={ogImage}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-lg font-bold text-stone-300 select-none">
              {letter}
            </span>
          )}
        </div>

        {/* Name + domain */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-stone-900 text-base leading-snug truncate">
            {name}
          </h3>
          <p className="text-xs text-stone-400 mt-0.5 truncate">{domain}</p>
        </div>
      </div>

      {/* Category pills */}
      {visibleCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {visibleCategories.map((cat) => (
            <span
              key={cat.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700/70"
            >
              {cat.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-50 text-stone-400">
              +{extraCount}
            </span>
          )}
        </div>
      )}
    </a>
  );
}
