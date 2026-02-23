import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import { ShopTable } from "@/features/shops/ShopTable.tsx";
import { useAdminShops, useDeleteShop } from "@/features/shops/hooks/useAdminShops.ts";
import { useState } from "react";
import { SFXmark } from "sf-symbols-lib/monochrome";

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

  return (
    <div>
      <PageHeader title="Shops">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="h-9 w-52 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)]"
            >
              <SFXmark className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
            <div
              key={key}
              className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
            />
          ))}
        </div>
      )}

      {!isLoading && shops.length === 0 && (
        <p className="text-center py-16 text-[var(--ds-text-subtle)]">
          Noch keine Shops vorhanden.
        </p>
      )}

      {!isLoading && shops.length > 0 && filtered.length === 0 && (
        <p className="text-center py-16 text-[var(--ds-text-subtle)]">
          Keine Treffer für „{search}".
        </p>
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
          <div className="relative bg-[var(--ds-surface)] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[var(--ds-text)] mb-2">Shop löschen?</h3>
            <p className="text-sm text-[var(--ds-text-muted)] mb-5">
              <span className="font-medium">{deleteTarget.name}</span> wird dauerhaft entfernt.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
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
