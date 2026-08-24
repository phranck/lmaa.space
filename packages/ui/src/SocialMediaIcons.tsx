import type { SocialMediaLinks } from "@lmaa/shared";

import { PLATFORM_MAP } from "./social-media-platforms";

export interface SocialMediaIconsProps {
  socialMedia: SocialMediaLinks;
  className?: string;
  linkable?: boolean;
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
}: SocialMediaIconsProps) {
  const entries = socialMedia.flatMap((link) => {
    const platform = PLATFORM_MAP.get(link.platform);
    return platform ? [{ ...platform, url: link.url }] : [];
  });

  if (entries.length === 0) return null;

  return (
    <div className={className ?? "flex items-center gap-3 mt-3"}>
      {entries.map(({ key, label, icon: Icon, url }) =>
        linkable ? (
          <a
            key={`${key}-${url}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-400 hover:text-stone-600 transition-colors"
            aria-label={label}
            title={label}
          >
            <Icon size={20} />
          </a>
        ) : (
          <span key={`${key}-${url}`} className="text-stone-400" aria-label={label} title={label}>
            <Icon size={14} />
          </span>
        ),
      )}
    </div>
  );
}
