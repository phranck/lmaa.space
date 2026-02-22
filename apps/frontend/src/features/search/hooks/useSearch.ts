import { useMemo } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import type { Shop } from "@dein-shop/shared";

const FUSE_OPTIONS: IFuseOptions<Shop> = {
  keys: [
    { name: "name", weight: 0.4 },
    { name: "description", weight: 0.3 },
    { name: "categoryName", weight: 0.2 },
    { name: "region", weight: 0.05 },
    { name: "shipping", weight: 0.05 },
  ],
  threshold: 0.35,
  minMatchCharLength: 2,
  includeScore: true,
};

export function useSearch(shops: Shop[], query: string) {
  const fuse = useMemo(() => new Fuse(shops, FUSE_OPTIONS), [shops]);

  return useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    return fuse.search(query).map((r) => r.item);
  }, [fuse, query]);
}
