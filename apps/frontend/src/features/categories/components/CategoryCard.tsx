import { resolveImageUrl } from "@/lib/api.ts";
import type { Category } from "@lmaa/shared";
import { useState } from "react";
import { Link } from "react-router";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveImageUrl(category.imageUrl) ?? `/images/${category.slug}.jpg`;
  const hasImage = !imgError;

  return (
    <Link
      to={`/kategorie/${category.slug}`}
      className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:border-stone-300 hover:shadow-lg transition-all duration-300"
    >
      {/* Photo or placeholder */}
      <div className="aspect-video overflow-hidden relative">
        {hasImage ? (
          <img
            src={resolvedUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
            <span className="font-serif font-bold text-4xl text-stone-300 select-none">
              {category.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="px-4 py-3">
        <p className="font-serif font-semibold text-stone-800 text-base leading-snug truncate group-hover:text-amber-700 transition-colors">
          {category.name}
        </p>
        {category.shopCount !== undefined && (
          <p className="text-stone-400 text-sm mt-0.5">
            {category.shopCount} {category.shopCount === 1 ? "Shop" : "Shops"}
          </p>
        )}
      </div>
    </Link>
  );
}
