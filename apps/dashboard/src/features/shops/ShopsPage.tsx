import { ConfirmDialog } from "@/components/ui/ConfirmDialog.tsx";
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
          className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
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

      <ConfirmDialog
        open={deleteId !== null && !!deleteTarget}
        title="Shop löschen?"
        description={
          <>
            <span className="font-medium">{deleteTarget?.name}</span> wird dauerhaft entfernt.
          </>
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId !== null)
            deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
