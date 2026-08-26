import { QrCodeIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { useEffect, useReducer, useRef, useState } from "react";

import { encodeShopToken, type Shop } from "@lmaa/shared";

import SupportPromptSlot from "@/components/islands/SupportPromptSlot";
import ShopCardReact from "@/components/ShopCardReact";
import { fetchJson } from "@/lib/fetch-json";
import {
  encodeLikedIds,
  getLikedShopIds,
  parseImportParam,
  saveLikedShopIds,
} from "@/lib/liked-shops";
import type { SupportPromptSlotData } from "@/lib/support-prompts";

// ── Import Dialog ────────────────────────────────────────────────────
function ImportDialog({
  importCount,
  hasExisting,
  onMerge,
  onReplace,
  onCancel,
}: {
  importCount: number;
  hasExisting: boolean;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Importdialog schließen"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <dialog
        open
        aria-labelledby="liked-shops-import-title"
        className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
      >
        <h2
          id="liked-shops-import-title"
          className="font-serif text-xl font-semibold text-stone-900 mb-1"
        >
          Shops importieren
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          {importCount} {importCount === 1 ? "Shop wird" : "Shops werden"} importiert.
          {hasExisting ? " Du hast bereits gelikte Shops auf diesem Gerät." : ""}
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
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl text-sm text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
        </div>
      </dialog>
    </div>
  );
}

// ── QR / Share Dialog ────────────────────────────────────────────────
function SyncDialog({ onClose }: { onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const [likedIds] = useState(() => [...getLikedShopIds()]);
  const encoded = encodeLikedIds(likedIds);
  const syncUrl = `${window.location.origin}/my-shops?s=${encoded}`;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!qrRef.current) return;

    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
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

      qrRef.current!.innerHTML = "";
      qrCode.append(qrRef.current!);
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Synchronisationsdialog schließen"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <dialog
        open
        aria-labelledby="liked-shops-sync-title"
        className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
      >
        <h2
          id="liked-shops-sync-title"
          className="font-serif text-xl font-semibold text-stone-900 mb-1"
        >
          Shops synchronisieren
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          Scanne den QR-Code oder teile den Link, um deine gelikten Shops auf ein anderes Gerät zu
          übertragen.
        </p>

        <div ref={qrRef} className="rounded-lg overflow-hidden mx-auto mb-5" />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <ShareNetworkIcon weight="duotone" className="size-4" />
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
      </dialog>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
interface LikedShopsState {
  shops: Shop[];
  loading: boolean;
  showSync: boolean;
  importData: { ids: string[]; cleanUrl: string } | null;
  importDone: boolean;
}

type LikedShopsAction = Partial<LikedShopsState>;

function likedShopsReducer(state: LikedShopsState, action: LikedShopsAction): LikedShopsState {
  return { ...state, ...action };
}

interface LikedShopsGridProps {
  /** The prompts for this page, already rendered on the server. */
  supportPrompts: SupportPromptSlotData;
}

/**
 * The grid of shops somebody has kept, with the ask placed inside it.
 *
 * The prompt is drawn here rather than under the grid, because it belongs after
 * the first row: first a person sees what they have, then the question follows.
 * A row is not a fixed number of cards, so the prompt is given the second grid
 * row outright and the cards flow around it. That holds at two columns and at
 * four without asking how wide the window is.
 */
export default function LikedShopsGrid({ supportPrompts }: LikedShopsGridProps) {
  const [state, dispatch] = useReducer(likedShopsReducer, {
    shops: [],
    loading: true,
    showSync: false,
    importData: null,
    importDone: false,
  });
  const { shops, loading, showSync, importData, importDone } = state;

  function loadShops(signal?: AbortSignal) {
    const likedIds = getLikedShopIds();
    if (likedIds.size === 0) {
      dispatch({ shops: [], loading: false });
      return;
    }

    fetchJson<Shop[]>("/shops", { signal })
      .then((shops) => {
        dispatch({ shops: shops.filter((s) => likedIds.has(String(s.id))) });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Silent fail
      })
      .finally(() => dispatch({ loading: false }));
  }

  useEffect(() => {
    const controller = new AbortController();
    const pending = parseImportParam();
    if (pending) {
      dispatch({ importData: pending });
    }
    loadShops(controller.signal);
    return () => controller.abort();
  }, []);

  function handleImportMerge() {
    if (!importData) return;
    const existing = getLikedShopIds();
    for (const id of importData.ids) {
      existing.add(id);
    }
    saveLikedShopIds(existing);
    window.history.replaceState({}, "", importData.cleanUrl);
    dispatch({ importData: null, importDone: true });
    loadShops();
  }

  function handleImportReplace() {
    if (!importData) return;
    saveLikedShopIds(new Set(importData.ids));
    window.history.replaceState({}, "", importData.cleanUrl);
    dispatch({ importData: null, importDone: true });
    loadShops();
  }

  function handleImportCancel() {
    if (!importData) return;
    window.history.replaceState({}, "", importData.cleanUrl);
    dispatch({ importData: null });
  }

  if (loading && !importData) {
    return <p className="text-sm text-stone-400 text-center py-12">Lade deine Shops…</p>;
  }

  return (
    <>
      {importData && (
        <ImportDialog
          importCount={importData.ids.length}
          hasExisting={getLikedShopIds().size > 0}
          onMerge={handleImportMerge}
          onReplace={handleImportReplace}
          onCancel={handleImportCancel}
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
      ) : (
        shops.length > 0 && (
          <>
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => dispatch({ showSync: true })}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <QrCodeIcon weight="duotone" className="size-4" />
                Sync
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {/* Given the second row outright, so the cards flow around it and
                  it lands after the first row however many columns there are. */}
              <SupportPromptSlot
                slot="my-shops"
                className="col-start-1 col-end-[-1] row-start-2"
                {...supportPrompts}
              />
              {shops.map((shop) => (
                <ShopCardReact
                  key={shop.id}
                  shopId={shop.id}
                  name={shop.name}
                  ogImage={shop.ogImage}
                  logoBackgroundColor={shop.logoBackgroundColor}
                  url={shop.url}
                  categories={shop.categories}
                  detailHref={`/shop/${encodeShopToken(shop.id)}?from=likes`}
                  hasCoordinates={
                    shop.headquarters?.latitude != null && shop.headquarters?.longitude != null
                  }
                  hideLikeIndicator
                />
              ))}
            </div>
          </>
        )
      )}

      {showSync && <SyncDialog onClose={() => dispatch({ showSync: false })} />}
    </>
  );
}
