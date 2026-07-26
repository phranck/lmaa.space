import { HeartIcon, MapPinLineIcon } from "@phosphor-icons/react";

import { resolveLogoBackground } from "@lmaa/shared";

import { getLikedShopIds } from "@/lib/liked-shops";
import { shopDomain } from "@/lib/shop";

interface ShopCategory {
  id: number;
  name: string;
  slug: string;
}

interface ShopCardProps {
  shopId: number;
  name: string;
  ogImage?: string | null;
  logoBackgroundColor?: string | null;
  url: string;
  categories?: ShopCategory[];
  detailHref: string;
  hasCoordinates?: boolean;
  hideLikeIndicator?: boolean;
}

const MAX_PILLS = 2;

/**
 * Shop listing card with category pills, OG image, and map-pin indicator.
 *
 * Used inside filterable island components that need React-controlled rendering.
 */
function isShopLiked(id: number): boolean {
  return getLikedShopIds().has(String(id));
}

export default function ShopCardReact({
  shopId,
  name,
  ogImage,
  logoBackgroundColor,
  url,
  categories,
  detailHref,
  hasCoordinates = false,
  hideLikeIndicator = false,
}: ShopCardProps) {
  const domain = shopDomain(url);
  const letter = name.charAt(0).toUpperCase();
  const liked = !hideLikeIndicator && isShopLiked(shopId);
  const visibleCategories = categories?.slice(0, MAX_PILLS) ?? [];
  const extraCount = (categories?.length ?? 0) - MAX_PILLS;

  return (
    <a
      href={detailHref}
      className="relative block bg-white rounded-2xl border border-stone-200 p-2 sm:p-4 hover:border-stone-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {liked && (
        <span className="absolute -right-2 -top-2 text-red-500 z-10" aria-hidden="true">
          <HeartIcon weight="duotone" className="size-5" />
        </span>
      )}
      {hasCoordinates && (
        <span className="absolute top-2 right-2 text-stone-300" title="Standort verfügbar">
          <MapPinLineIcon weight="duotone" className="size-3.5" />
        </span>
      )}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="shrink-0 size-12 rounded-lg overflow-hidden border border-stone-100 flex items-center justify-center"
          style={{ backgroundColor: resolveLogoBackground(logoBackgroundColor) }}
        >
          {ogImage ? (
            <img
              src={ogImage}
              alt=""
              aria-hidden="true"
              loading="lazy"
              width={48}
              height={48}
              className="size-full object-contain"
            />
          ) : (
            <span className="text-lg font-bold text-stone-300 select-none">{letter}</span>
          )}
        </div>

        {/* Name + domain */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-stone-900 text-base leading-snug truncate">
            {name}
          </h3>
          <p className="text-xs text-stone-600 mt-0.5 truncate">{domain}</p>
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
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-50 text-stone-600">
              +{extraCount}
            </span>
          )}
        </div>
      )}
    </a>
  );
}
