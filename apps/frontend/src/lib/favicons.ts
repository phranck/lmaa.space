import type { SocialMediaLinks } from "@lmaa/shared";

import { apiGetInternal } from "@/lib/api";

/** What the internal route answers with. */
interface FaviconResponse {
  dataUrl: string | null;
}

/**
 * The site marks for every website among a set of addresses.
 *
 * Resolved on the server and handed to the page as data, so a visitor's browser
 * never asks a sponsor's or a shop's website for an image. Naming the icon's
 * address instead would tell every one of those sites who is reading this page.
 *
 * Only websites are looked up. Every other platform has a mark of its own that
 * already says which service it is.
 *
 * @param links - Every address on the page, from as many cards as it shows.
 * @returns The mark against the address it belongs to. An address whose site
 *   has no readable icon is absent, and the globe stands for it.
 */
export async function getFavicons(links: SocialMediaLinks): Promise<Record<string, string>> {
  const websites = [
    ...new Set(links.flatMap((link) => (link.platform === "website" ? [link.url] : []))),
  ];
  if (websites.length === 0) return {};

  const found = await Promise.all(
    websites.map(async (url) => {
      try {
        const answer = await apiGetInternal<FaviconResponse>(
          `/internal/favicon?url=${encodeURIComponent(url)}`,
        );
        return [url, answer.dataUrl] as const;
      } catch {
        // A site that cannot be read is a site without a mark, which the page
        // already knows how to show.
        return [url, null] as const;
      }
    }),
  );

  return Object.fromEntries(found.filter((entry): entry is [string, string] => entry[1] !== null));
}
