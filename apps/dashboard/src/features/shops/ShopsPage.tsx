import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { ShopDeleteReasonCard } from "@/features/shops/ShopDeleteReasonCard.tsx";
import { ShopEditCard } from "@/features/shops/ShopEditCard.tsx";
import { ShopTable } from "@/features/shops/ShopTable.tsx";
import {
  useAdminShops,
  useDeleteShop,
  useSetShopVisibility,
  useUpdateDeleteReason,
} from "@/features/shops/hooks/useAdminShops.ts";
import type { ShopVisibility } from "@lmaa/shared";
import { useState } from "react";
import {
  SFEyeFill,
  SFMagnifyingglass,
  SFPauseCircleFill,
  SFSquareGrid2x2Fill,
  SFStorefrontFill,
  SFTrashFill,
  SFXmark,
} from "sf-symbols-lib/monochrome";

type VisibilityFilter = "all" | ShopVisibility;

/**
 * Shop management route with filters and moderation actions.
 *
 * @returns Shops administration page.
 */
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
  const updateReasonMutation = useUpdateDeleteReason();

  const filtered = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteTarget = shops.find((s) => s.id === deleteId);

  const canModify = me?.role !== "moderator";

  const filterOptions: DropdownOption<VisibilityFilter>[] = [
    {
      value: "all",
      label: shopsMessages.filters.all,
      icon: <SFSquareGrid2x2Fill className="w-3.5 h-3.5" />,
    },
    {
      value: "public",
      label: shopsMessages.filters.public,
      icon: <SFEyeFill className="w-3.5 h-3.5" />,
    },
    {
      value: "onhold",
      label: shopsMessages.filters.onhold,
      icon: <SFPauseCircleFill className="w-3.5 h-3.5" />,
    },
    {
      value: "deleted",
      label: shopsMessages.filters.deleted,
      icon: <SFTrashFill className="w-3.5 h-3.5" />,
    },
  ];

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

        <Dropdown value={visibilityFilter} onChange={setVisibilityFilter} options={filterOptions} />

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
        <ContentUnavailableView
          icon={<SFStorefrontFill aria-hidden />}
          title={shopsMessages.noShops}
          subtitle={shopsMessages.noShopsHint}
        />
      )}

      {!isLoading && shops.length > 0 && filtered.length === 0 && (
        <ContentUnavailableView
          icon={<SFMagnifyingglass aria-hidden />}
          title={`${shopsMessages.noResultsPrefix} „${search}".`}
          subtitle={shopsMessages.noResultsHint}
        />
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
            onUpdateReason={
              canModify
                ? (id, reason) => updateReasonMutation.mutateAsync({ id, reason })
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
          onConfirm={(reason, wasReported, mode) => {
            deleteMutation.mutate(
              { id: deleteId, reason, wasReported, mode },
              { onSuccess: () => setDeleteId(null) },
            );
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
