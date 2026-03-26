import { useEffect, useState } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import ShopCardReact from "@/components/ShopCardReact";
import { API_BASE } from "@/lib/client-api";

function getLikedShopIds(): Set<string> {
  try {
    const raw = localStorage.getItem("lmaa-liked-shops");
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export default function LikedShopsGrid() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const likedIds = getLikedShopIds();
    if (likedIds.size === 0) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/shops`)
      .then((res) => res.json())
      .then((json: { data: Shop[] }) => {
        setShops(json.data.filter((s) => likedIds.has(String(s.id))));
      })
      .catch(() => {
        // Silent fail
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-stone-400 text-center py-12">Lade deine Shops...</p>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 text-lg mb-2">Du hast noch keine Shops geliked.</p>
        <p className="text-stone-400 text-sm">
          Klicke auf das Herz-Symbol auf einer Shop-Detailseite, um Shops hier zu sammeln.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {shops.map((shop) => (
        <ShopCardReact
          key={shop.id}
          shopId={shop.id}
          name={shop.name}
          ogImage={shop.ogImage}
          url={shop.url}
          categories={shop.categories}
          detailHref={`/shop/${encodeShopToken(shop.id)}?from=likes`}
          hasCoordinates={shop.headquarters?.latitude != null && shop.headquarters?.longitude != null}
          hideLikeIndicator
        />
      ))}
    </div>
  );
}
