import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import { ShopTable } from "@/features/shops/ShopTable.tsx";
import { useAdminShops, useDeleteShop } from "@/features/shops/hooks/useAdminShops.ts";
import { useState } from "react";

export function ShopsPage() {
  const [editTarget, setEditTarget] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: shops = [], isLoading } = useAdminShops();
  const deleteMutation = useDeleteShop();

  const filtered = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteTarget = shops.find((s) => s.id === deleteId);
  const editShop =
    typeof editTarget === "number" ? shops.find((s) => s.id === editTarget) : undefined;

  return (
    <div>
      <PageHeader title="Shops">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen…"
          className="h-9 w-52 px-3 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="h-9 px-4 bg-[var(--color-primary)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Neuer Shop
        </button>
      </PageHeader>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-px">
          {Array.from({ length: 8 }, (_, i) => `sk-${i}`).map((key) => (
            <div key={key} className="h-14 bg-white animate-pulse border-b border-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && shops.length === 0 && (
        <p className="text-center py-16 text-gray-400">Noch keine Shops vorhanden.</p>
      )}

      {!isLoading && shops.length > 0 && filtered.length === 0 && (
        <p className="text-center py-16 text-gray-400">Keine Treffer für „{search}".</p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="-mx-6 -mt-6">
          <ShopTable shops={filtered} onEdit={setEditTarget} onDelete={setDeleteId} />
        </div>
      )}

      {/* Edit / New Overlay */}
      {editTarget !== null && (
        <ShopEditCard
          shopId={editTarget}
          initialData={
            editShop
              ? {
                  name: editShop.name,
                  url: editShop.url,
                  description: editShop.description ?? "",
                  categoryIds: editShop.categories.map((c) => c.id),
                  region: editShop.region ?? "",
                  shipping: editShop.shipping ?? "",
                }
              : undefined
          }
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteId !== null && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteId(null)}
            aria-label="Abbrechen"
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Shop löschen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium">{deleteTarget.name}</span> wird dauerhaft entfernt.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-control text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
                }
                className="flex-1 py-2.5 bg-red-500 text-white rounded-control text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "…" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
