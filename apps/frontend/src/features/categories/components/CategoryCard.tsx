import { Link } from "react-router";
import type { Category } from "@dein-shop/shared";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      to={`/kategorie/${category.slug}`}
      className="group flex flex-col items-center gap-3 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[var(--color-primary-light)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <span className="text-3xl" role="img" aria-hidden>
        🛍️
      </span>
      <div className="text-center">
        <p className="font-semibold text-gray-800 group-hover:text-[var(--color-primary)] transition-colors text-sm leading-tight">
          {category.name}
        </p>
        {category.shopCount !== undefined && (
          <p className="text-xs text-gray-400 mt-0.5">
            {category.shopCount} {category.shopCount === 1 ? "Shop" : "Shops"}
          </p>
        )}
      </div>
    </Link>
  );
}
