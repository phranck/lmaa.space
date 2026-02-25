import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import { ShopTable } from "@/features/shops/ShopTable.tsx";
import { ShopDeleteReasonCard } from "@/features/shops/ShopDeleteReasonCard.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminShops, useDeleteShop } from "@/features/shops/hooks/useAdminShops.ts";
import { useState } from "react";
import { SFXmark } from "sf-symbols-lib/monochrome";

export function ShopsPage() {
  const { user: me } = useAuth();
  const [editTarget, setEditTarget] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  const { data: shops = [], isLoading } = useAdminShops(showDeleted);
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
        <label className="flex items-center gap-2 text-sm text-[var(--ds-text-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--color-primary)]"
          />
          Gelöschte anzeigen
        </label>
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
          <ShopTable
            shops={filtered}
            onEdit={setEditTarget}
            onDelete={me?.role !== "moderator" ? setDeleteId : undefined}
          />
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

      {/* Delete Modal */}
      {deleteId !== null && deleteTarget && (
        <ShopDeleteReasonCard
          shopName={deleteTarget.name}
          wasReported={deleteTarget.deletedWasReported}
          isPending={deleteMutation.isPending}
          onConfirm={(reason, wasReported) => {
            deleteMutation.mutate(
              { id: deleteId, reason, wasReported },
              { onSuccess: () => setDeleteId(null) },
            );
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
