import UnsplashAttribution from "@/components/UnsplashAttribution";

interface CategoryCardProps {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  imagePhotographer: string | null;
  imagePhotographerUrl: string | null;
  imageFocalPointY: number;
  shopCount: number;
  href: string;
}

/**
 * Category grid card with an optional hero image and shop count badge.
 *
 * Links to the category page at the provided `href`.
 */
export default function CategoryCard({
  id,
  name,
  slug,
  imageUrl,
  imagePhotographer,
  imagePhotographerUrl,
  imageFocalPointY,
  shopCount,
  href,
}: CategoryCardProps) {
  return (
    <div
      className="group relative block rounded-lg sm:rounded-2xl overflow-hidden border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      data-analytics-event="category-click"
      data-analytics-source="homepage-card"
      data-category-id={String(id)}
      data-category-slug={slug}
      data-category-name={name}
    >
      <a href={href} className="absolute inset-0 z-[1]" aria-label={name} />

      <div className="aspect-video overflow-hidden relative">
        <img
          src={imageUrl ?? `/images/${slug}.jpg`}
          alt=""
          aria-hidden="true"
          width={640}
          height={360}
          className="w-full h-full object-cover"
          style={{ objectPosition: `50% ${imageFocalPointY}%` }}
          loading="lazy"
          data-img-fallback=""
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center hidden"
          aria-hidden="true"
        >
          <span className="font-serif font-bold text-4xl text-stone-300 select-none">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        {imagePhotographer && imagePhotographerUrl && (
          <UnsplashAttribution
            photographer={imagePhotographer}
            photographerUrl={imagePhotographerUrl}
            gradient
            className="z-[2] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>

      <div style={{ padding: "var(--public-card-padding)" }}>
        <p className="font-serif font-semibold text-stone-800 text-base sm:text-lg leading-snug truncate group-hover:text-amber-700 transition-colors">
          {name}
        </p>
        <p className="text-stone-600 text-xs mt-0.5">
          {shopCount} {shopCount === 1 ? "Shop" : "Shops"}
        </p>
      </div>
    </div>
  );
}
