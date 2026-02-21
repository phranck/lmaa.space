import { Link } from "react-router";
import type { Category } from "@dein-shop/shared";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      to={`/kategorie/${category.slug}`}
      className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:border-stone-300 hover:shadow-lg transition-all duration-300"
    >
      {/* Photo */}
      <div className="aspect-video overflow-hidden">
        <img
          src={category.imageUrl ?? `/images/${category.slug}.jpg`}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Text */}
      <div className="px-4 py-3 flex items-center gap-3">
<div className="min-w-0">
          <p className="font-serif font-semibold text-stone-800 text-base leading-snug truncate group-hover:text-amber-700 transition-colors">
            {category.name}
          </p>
          {category.shopCount !== undefined && (
            <p className="text-stone-400 text-sm mt-0.5">
              {category.shopCount} {category.shopCount === 1 ? "Shop" : "Shops"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
