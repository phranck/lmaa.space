interface CategoryCardProps {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  shopCount: number;
  href: string;
}

export default function CategoryCard({
  id,
  name,
  slug,
  imageUrl,
  shopCount,
  href,
}: CategoryCardProps) {
  return (
    <a
      href={href}
      className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      data-analytics-event="category-click"
      data-analytics-source="homepage-card"
      data-category-id={String(id)}
      data-category-slug={slug}
      data-category-name={name}
    >
      <div className="aspect-video overflow-hidden relative">
        <img
          src={imageUrl ?? `/images/${slug}.jpg`}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          loading="lazy"
          data-img-fallback=""
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 items-center justify-center hidden"
          aria-hidden="true"
        >
          <span className="font-serif font-bold text-4xl text-stone-300 select-none">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="font-serif font-semibold text-stone-800 text-base leading-snug truncate group-hover:text-amber-700 transition-colors">
          {name}
        </p>
        <p className="text-stone-400 text-sm mt-0.5">
          {shopCount} {shopCount === 1 ? "Shop" : "Shops"}
        </p>
      </div>
    </a>
  );
}
