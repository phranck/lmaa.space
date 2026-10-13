import UnsplashAttribution from "@/components/UnsplashAttribution";
import { unsplashAvif } from "@/lib/unsplash-photo";

/**
 * The photo's size in pixels. A card shows it at 294 CSS pixels across at the
 * most, which is 588 on a screen of twice the density, so 640 is enough. As
 * AVIF it weighs about a fifth of the stored 1080-pixel JPEG. Its proportion
 * is the card's 16 by 9.
 */
const CARD_PHOTO_WIDTH = 640;
const CARD_PHOTO_HEIGHT = 360;

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
      className="group relative block rounded-lg sm:rounded-2xl overflow-hidden border border-[var(--ds-border)] bg-[var(--ds-surface)] hover:border-[var(--ds-border-hover)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      data-analytics-event="category-click"
      data-analytics-source="homepage-card"
      data-category-id={String(id)}
      data-category-slug={slug}
      data-category-name={name}
    >
      <a href={href} className="absolute inset-0 z-[1]" aria-label={name} />

      <div className="aspect-video overflow-hidden relative">
        <img
          src={imageUrl ? unsplashAvif(imageUrl, CARD_PHOTO_WIDTH) : `/images/${slug}.jpg`}
          alt=""
          aria-hidden="true"
          width={CARD_PHOTO_WIDTH}
          height={CARD_PHOTO_HEIGHT}
          className="w-full h-full object-cover"
          style={{ objectPosition: `50% ${imageFocalPointY}%` }}
          loading="lazy"
          data-img-fallback=""
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[var(--ds-bg-elevated)] to-[var(--ds-surface-inset)] flex items-center justify-center hidden"
          aria-hidden="true"
        >
          <span className="font-serif font-bold text-4xl text-[var(--ds-text-placeholder)] select-none">
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
        <p className="font-label font-semibold text-[var(--ds-text)] text-base sm:text-lg leading-snug truncate group-hover:text-[var(--ds-accent-text)] transition-colors">
          {name}
        </p>
        <p className="text-[var(--ds-text-muted)] text-xs mt-0.5">
          {shopCount} {shopCount === 1 ? "Shop" : "Shops"}
        </p>
      </div>
    </div>
  );
}
