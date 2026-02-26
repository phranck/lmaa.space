import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { ShopDeleteReasonCard } from "@/features/shops/ShopDeleteReasonCard.tsx";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import { ShopTable } from "@/features/shops/ShopTable.tsx";
import {
  useAdminShops,
  useDeleteShop,
  useSetShopVisibility,
} from "@/features/shops/hooks/useAdminShops.ts";
import { useState } from "react";
import { SFEyeFill, SFPauseCircleFill, SFTrashFill, SFXmark } from "sf-symbols-lib/monochrome";

type VisibilityFilter = "all" | "public" | "onhold" | "deleted";

export function ShopsPage() {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;
  const { user: me } = useAuth();
  const [editTarget, setEditTarget] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  const { data: shops = [], isLoading } = useAdminShops(
    visibilityFilter === "all" ? undefined : visibilityFilter,
  );
  const deleteMutation = useDeleteShop();
  const visibilityMutation = useSetShopVisibility();

  const filtered = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteTarget = shops.find((s) => s.id === deleteId);

  const canModify = me?.role !== "moderator";

  const filterOptions = [
    { value: "all" as VisibilityFilter, label: shopsMessages.filters.all },
    {
      value: "public" as VisibilityFilter,
      label: shopsMessages.filters.public,
      icon: <SFEyeFill className="w-3.5 h-3.5" />,
    },
    {
      value: "onhold" as VisibilityFilter,
      label: shopsMessages.filters.onhold,
      icon: <SFPauseCircleFill className="w-3.5 h-3.5" />,
    },
    {
      value: "deleted" as VisibilityFilter,
      label: shopsMessages.filters.deleted,
      icon: <SFTrashFill className="w-3.5 h-3.5" />,
    },
  ] as const;

  return (
    <div>
      <PageHeader title={shopsMessages.title}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={shopsMessages.searchPlaceholder}
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

        <SegmentedControl
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={filterOptions}
        />

        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
        >
          {shopsMessages.newShop}
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
        <p className="text-center py-16 text-[var(--ds-text-subtle)]">{shopsMessages.noShops}</p>
      )}

      {!isLoading && shops.length > 0 && filtered.length === 0 && (
        <p className="text-center py-16 text-[var(--ds-text-subtle)]">
          {shopsMessages.noResultsPrefix} „{search}".
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="-mx-6 -mt-6">
          <ShopTable
            shops={filtered}
            onEdit={setEditTarget}
            onDelete={canModify ? setDeleteId : undefined}
            onHold={
              canModify
                ? (id) => visibilityMutation.mutate({ id, visibility: "onhold" })
                : undefined
            }
            onRestore={
              canModify
                ? (id) => visibilityMutation.mutate({ id, visibility: "public" })
                : undefined
            }
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
