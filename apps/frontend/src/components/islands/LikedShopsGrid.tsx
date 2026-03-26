import { QrCodeIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef, useState } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import ShopCardReact from "@/components/ShopCardReact";
import { API_BASE } from "@/lib/client-api";

const LIKES_KEY = "lmaa-liked-shops";

// ── Compact URL encoding ─────────────────────────────────────────────
// Sorted numeric IDs → delta-encoded → base36 → joined with "-"
function encodeLikedIds(ids: string[]): string {
  const nums = ids.map(Number).filter((n) => n > 0).sort((a, b) => a - b);
  if (nums.length === 0) return "";
  const deltas: number[] = [nums[0]];
  for (let i = 1; i < nums.length; i++) {
    deltas.push(nums[i] - nums[i - 1]);
  }
  return deltas.map((d) => d.toString(36)).join("-");
}

function decodeLikedIds(encoded: string): string[] {
  if (!encoded) return [];
  const deltas = encoded.split("-").map((s) => Number.parseInt(s, 36));
  if (deltas.some((d) => Number.isNaN(d))) return [];
  const ids: number[] = [];
  let current = 0;
  for (const delta of deltas) {
    current += delta;
    ids.push(current);
  }
  return ids.map(String);
}

// ── localStorage helpers ─────────────────────────────────────────────
function getLikedShopIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveLikedShopIds(ids: Set<string>) {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...ids]));
}

// ── Parse import param from URL (without applying) ───────────────────
function parseImportParam(): { ids: string[]; cleanUrl: string } | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("s");
  if (!encoded) return null;

  const ids = decodeLikedIds(encoded);
  if (ids.length === 0) return null;

  params.delete("s");
  const clean = params.toString();
  const cleanUrl = `${window.location.pathname}${clean ? `?${clean}` : ""}`;

  return { ids, cleanUrl };
}

// ── Import Dialog ────────────────────────────────────────────────────
function ImportDialog({
  importCount,
  hasExisting,
  onMerge,
  onReplace,
}: {
  importCount: number;
  hasExisting: boolean;
  onMerge: () => void;
  onReplace: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
          Shops importieren
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          {importCount} {importCount === 1 ? "Shop wird" : "Shops werden"} importiert.
          {hasExisting
            ? " Du hast bereits gelikte Shops auf diesem Gerät."
            : ""}
        </p>

        <div className="flex flex-col gap-2">
          {hasExisting && (
            <button
              type="button"
              onClick={onMerge}
              className="h-10 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Zusammenführen
            </button>
          )}
          <button
            type="button"
            onClick={onReplace}
            className={`h-10 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              hasExisting
                ? "border border-stone-200 text-stone-600 hover:bg-stone-100"
                : "bg-stone-900 text-white hover:bg-stone-800"
            }`}
          >
            {hasExisting ? "Ersetzen" : "Importieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QR / Share Dialog ────────────────────────────────────────────────
function SyncDialog({ onClose }: { onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const likedIds = [...getLikedShopIds()];
  const encoded = encodeLikedIds(likedIds);
  const syncUrl = `${window.location.origin}/my-shops?s=${encoded}`;

  useEffect(() => {
    if (!qrRef.current) return;

    const qrCode = new QRCodeStyling({
      width: 200,
      height: 200,
      data: syncUrl,
      margin: 8,
      type: "svg",
      dotsOptions: {
        color: "#292524",
        type: "rounded",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#292524",
      },
      cornersDotOptions: {
        type: "dot",
        color: "#292524",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
    });

    qrRef.current.innerHTML = "";
    qrCode.append(qrRef.current);
  }, [syncUrl]);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Meine Shops auf lmaa.space", url: syncUrl });
      } catch {
        // User cancelled
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">
          Shops synchronisieren
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          Scanne den QR-Code oder teile den Link, um deine gelikten Shops auf ein anderes Gerät zu übertragen.
        </p>

        <div className="flex justify-center mb-5">
          <div ref={qrRef} className="rounded-lg overflow-hidden" />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <ShareNetworkIcon weight="duotone" className="w-4 h-4" />
            {copied ? "Link kopiert!" : "Link teilen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function LikedShopsGrid() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSync, setShowSync] = useState(false);
  const [importData, setImportData] = useState<{ ids: string[]; cleanUrl: string } | null>(null);
  const [importDone, setImportDone] = useState(false);

  function loadShops() {
    const likedIds = getLikedShopIds();
    if (likedIds.size === 0) {
      setShops([]);
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
  }

  useEffect(() => {
    const pending = parseImportParam();
    if (pending) {
      setImportData(pending);
    }
    loadShops();
  }, []);

  function handleImportMerge() {
    if (!importData) return;
    const existing = getLikedShopIds();
    for (const id of importData.ids) {
      existing.add(id);
    }
    saveLikedShopIds(existing);
    window.history.replaceState({}, "", importData.cleanUrl);
    setImportData(null);
    setImportDone(true);
    loadShops();
  }

  function handleImportReplace() {
    if (!importData) return;
    saveLikedShopIds(new Set(importData.ids));
    window.history.replaceState({}, "", importData.cleanUrl);
    setImportData(null);
    setImportDone(true);
    loadShops();
  }

  if (loading && !importData) {
    return (
      <p className="text-sm text-stone-400 text-center py-12">Lade deine Shops...</p>
    );
  }

  return (
    <>
      {importData && (
        <ImportDialog
          importCount={importData.ids.length}
          hasExisting={getLikedShopIds().size > 0}
          onMerge={handleImportMerge}
          onReplace={handleImportReplace}
        />
      )}

      {importDone && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
          Shops wurden erfolgreich importiert!
        </div>
      )}

      {shops.length === 0 && !importData ? (
        <div className="text-center py-16">
          <p className="text-stone-500 text-lg mb-2">Du hast noch keine Shops geliked.</p>
          <p className="text-stone-400 text-sm">
            Klicke auf das Herz-Symbol auf einer Shop-Detailseite, um Shops hier zu sammeln.
          </p>
        </div>
      ) : shops.length > 0 && (
        <>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setShowSync(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <QrCodeIcon weight="duotone" className="w-4 h-4" />
              Sync
            </button>
          </div>

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
        </>
      )}

      {showSync && <SyncDialog onClose={() => setShowSync(false)} />}
    </>
  );
}
