import { useQuery } from "@tanstack/react-query";

import type { SocialMediaLinks } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/** What the backend answers with for one address. */
interface FaviconResponse {
  dataUrl: string | null;
}

/** How long a resolved mark is kept before the backend is asked again. */
const CACHE_MS = 30 * 60 * 1000;

/**
 * The site marks for every website among a set of addresses.
 *
 * Resolved by the backend rather than by the browser, so the editor shows the
 * same mark the site itself will carry. Two lookups written separately would
 * drift, and the drift would show as an editor promising a mark the page then
 * does not have.
 *
 * An address whose site has no readable mark is simply absent from the answer,
 * and the globe stands for it.
 *
 * @param links - The addresses as currently entered.
 * @returns The mark against the address it belongs to.
 */
export function useFavicons(links: SocialMediaLinks): Record<string, string> {
  // Sorted so the query key does not change when the same addresses arrive in a
  // different order, which would otherwise ask the backend again for nothing.
  const websites = Array.from(
    new Set(
      links.flatMap((link) =>
        link.platform === "website" && link.url.startsWith("https://") ? [link.url] : [],
      ),
    ),
    // `Array.from` already builds a fresh array, so sorting it in place copies
    // nothing and mutates nothing the caller holds.
  ).sort();

  const { data } = useQuery({
    queryKey: ["favicons", websites],
    enabled: websites.length > 0,
    staleTime: CACHE_MS,
    queryFn: async () => {
      const found = await Promise.all(
        websites.map(async (url) => {
          try {
            const answer = await api.get<FaviconResponse>(
              `/admin/favicon?url=${encodeURIComponent(url)}`,
            );
            return [url, answer.dataUrl] as const;
          } catch {
            return [url, null] as const;
          }
        }),
      );
      return Object.fromEntries(
        found.filter((entry): entry is [string, string] => entry[1] !== null),
      );
    },
  });

  return data ?? {};
}
