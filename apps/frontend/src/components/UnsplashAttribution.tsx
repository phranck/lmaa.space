import { getSafeConfigHref } from "@/lib/safe-url";

const UTM = "?utm_source=lmaa_space&utm_medium=referral";

interface UnsplashAttributionProps {
  photographer: string;
  photographerUrl: string;
  /** Show a subtle dark gradient behind the text for readability on bright images. */
  gradient?: boolean;
  className?: string;
}

export default function UnsplashAttribution({
  photographer,
  photographerUrl,
  gradient = false,
  className = "",
}: UnsplashAttributionProps) {
  const safeProfileUrl = getSafeConfigHref(photographerUrl);
  return (
    <div className={`absolute inset-x-0 bottom-0 ${className}`}>
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      )}
      <p className="relative text-[9px] text-white/70 drop-shadow-sm text-right px-2 py-1.5">
        Photo{" "}
        {safeProfileUrl ? (
          <a
            href={`${safeProfileUrl}${UTM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-white/90"
          >
            {photographer}
          </a>
        ) : (
          <span className="font-semibold">{photographer}</span>
        )}
        {" @ "}
        <a
          href={`https://unsplash.com${UTM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:text-white/90"
        >
          Unsplash
        </a>
      </p>
    </div>
  );
}
