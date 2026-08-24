import type { SocialMediaLinks } from "@lmaa/shared";

import { PLATFORM_MAP } from "./social-media-platforms";

export interface SocialMediaIconsProps {
  socialMedia: SocialMediaLinks;
  className?: string;
  linkable?: boolean;
  /**
   * A site's own mark against the address it belongs to, as inline data.
   *
   * Only websites have one, because every other platform has a mark of its own
   * that says which service it is. Two websites side by side would otherwise be
   * two identical globes, which tells a reader nothing about either.
   *
   * Passed in rather than fetched here, because the mark is resolved by the
   * server. A page that merely named the icon's address would have every
   * visitor's browser call every sponsor's website.
   */
  favicons?: Record<string, string>;
}

/**
 * The row of icons for everywhere somebody can be found.
 *
 * The addresses appear in the order they were entered, because that order is
 * part of the data and somebody put their main address first on purpose. An
 * address whose platform is not one we know is left out rather than shown
 * without an icon.
 */
export function SocialMediaIcons({
  socialMedia,
  className,
  linkable = true,
  favicons,
}: SocialMediaIconsProps) {
  const entries = socialMedia.flatMap((link) => {
    const platform = PLATFORM_MAP.get(link.platform);
    if (!platform) return [];
    return [{ ...platform, url: link.url, favicon: favicons?.[link.url] }];
  });

  if (entries.length === 0) return null;

  const size = linkable ? 20 : 14;

  return (
    <div className={className ?? "flex items-center gap-3 mt-3"}>
      {entries.map(({ key, label, icon: Icon, url, favicon }) => {
        // The site's own mark says which of two websites this is; the globe
        // only says that it is one.
        const mark = favicon ? (
          <img
            src={favicon}
            alt=""
            width={size}
            height={size}
            className="rounded-[2px] object-contain"
            style={{ width: size, height: size }}
          />
        ) : (
          <Icon size={size} />
        );

        return linkable ? (
          <a
            key={`${key}-${url}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-400 hover:text-stone-600 transition-colors"
            aria-label={label}
            title={label}
          >
            {mark}
          </a>
        ) : (
          <span key={`${key}-${url}`} className="text-stone-400" aria-label={label} title={label}>
            {mark}
          </span>
        );
      })}
    </div>
  );
}
