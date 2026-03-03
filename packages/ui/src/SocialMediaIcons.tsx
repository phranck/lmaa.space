import { PLATFORMS } from "./social-media-platforms";

export interface SocialMediaIconsProps {
  socialMedia: Record<string, string>;
}

export function SocialMediaIcons({ socialMedia }: SocialMediaIconsProps) {
  const entries = PLATFORMS.filter((p) => socialMedia[p.key]).map((p) => ({
    ...p,
    url: socialMedia[p.key],
  }));

  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-3 mt-3">
      {entries.map(({ key, label, icon: Icon, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-400 hover:text-stone-600 transition-colors"
          aria-label={label}
          title={label}
        >
          <Icon size={16} />
        </a>
      ))}
    </div>
  );
}
