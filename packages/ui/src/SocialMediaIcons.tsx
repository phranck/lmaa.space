import { PLATFORMS } from "./social-media-platforms";

export interface SocialMediaIconsProps {
  socialMedia: Record<string, string>;
  className?: string;
  linkable?: boolean;
}

export function SocialMediaIcons({ socialMedia, className, linkable = true }: SocialMediaIconsProps) {
  const entries = PLATFORMS.filter((p) => socialMedia[p.key])
    .map((p) => ({ ...p, url: socialMedia[p.key] }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (entries.length === 0) return null;

  return (
    <div className={className ?? "flex items-center gap-3 mt-3"}>
      {entries.map(({ key, label, icon: Icon, url }) =>
        linkable ? (
          <a
            key={key}
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
          <span
            key={key}
            className="text-stone-400"
            aria-label={label}
            title={label}
          >
            <Icon size={14} />
          </span>
        ),
      )}
    </div>
  );
}
