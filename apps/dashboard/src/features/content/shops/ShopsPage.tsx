import { useCallback, useMemo, useState } from "react";
import SFEyeFill from "sf-symbols-lib/monochrome/SFEyeFill";
import SFMagnifyingglass from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import SFPauseCircleFill from "sf-symbols-lib/monochrome/SFPauseCircleFill";
import SFPlusCircleFill from "sf-symbols-lib/monochrome/SFPlusCircleFill";
import SFSquareGrid2x2Fill from "sf-symbols-lib/monochrome/SFSquareGrid2x2Fill";
import SFStorefrontFill from "sf-symbols-lib/monochrome/SFStorefrontFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import type { ShopVisibility } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import {
  useAdminShops,
  useDeleteShop,
  useSetShopVisibility,
  useUpdateDeleteReason,
} from "@/features/content/hooks/useAdminShops.ts";
import { ShopDeleteReasonCard } from "@/features/content/shops/ShopDeleteReasonCard.tsx";
import { ShopEditCard } from "@/features/content/shops/ShopEditCard.tsx";
import { ShopTable } from "@/features/content/shops/ShopTable.tsx";

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
  const [permanentDeleteId, setPermanentDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  const { data: shops = [], isLoading } = useAdminShops(
    visibilityFilter === "all" ? undefined : visibilityFilter,
  );
  const deleteMutation = useDeleteShop();
  const visibilityMutation = useSetShopVisibility();
  const updateReasonMutation = useUpdateDeleteReason();

  const searchLower = search.toLowerCase();
  const filtered = useMemo(
    () =>
      shops.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) || s.url.toLowerCase().includes(searchLower),
      ),
    [shops, searchLower],
  );

  const deleteTarget = shops.find((s) => s.id === deleteId);
  const permanentDeleteTarget = shops.find((s) => s.id === permanentDeleteId);

  const canModify = me?.role !== "moderator";

  const onHold = useCallback(
    (id: number) => visibilityMutation.mutate({ id, visibility: "onhold" }),
    [visibilityMutation],
  );
  const onRestore = useCallback(
    (id: number) => visibilityMutation.mutate({ id, visibility: "public" }),
    [visibilityMutation],
  );
  const onUpdateReason = useCallback(
    async (id: number, reason: string | null) => {
      await updateReasonMutation.mutateAsync({ id, reason });
    },
    [updateReasonMutation],
  );

  const filterOptions = useMemo<DropdownOption<VisibilityFilter>[]>(
    () => [
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
      {
        value: "rejected",
        label: shopsMessages.filters.rejected,
        icon: <SFXmarkCircleFill className="w-3.5 h-3.5" />,
      },
    ],
    [shopsMessages],
  );

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title={shopsMessages.title}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={shopsMessages.searchPlaceholder}
            className="py-1.5 w-52 px-3 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] pr-7"
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
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
        >
          <SFPlusCircleFill className="w-3.5 h-3.5" />
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
        <div className="-mx-3 -mt-3">
          <ShopTable
            shops={filtered}
            onEdit={setEditTarget}
            onDelete={canModify ? setDeleteId : undefined}
            onPermanentDelete={canModify ? setPermanentDeleteId : undefined}
            onHold={canModify ? onHold : undefined}
            onRestore={canModify ? onRestore : undefined}
            onUpdateReason={canModify ? onUpdateReason : undefined}
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

      {/* Permanent Delete Confirmation */}
      <Dialog
        open={permanentDeleteId !== null && permanentDeleteTarget !== undefined}
        title={shopsMessages.table.permanentDeleteTitle}
        titleIcon={<SFTrashFill className={dialogHeaderIconClass} />}
        onClose={() => setPermanentDeleteId(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{permanentDeleteTarget?.name}</span>{" "}
            {shopsMessages.table.permanentDeleteDescription}
          </p>
        </div>
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => setPermanentDeleteId(null)}
            className={dialogBtnSecondary}
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (permanentDeleteId === null) return;
              deleteMutation.mutate(
                { id: permanentDeleteId, mode: "delete" },
                { onSuccess: () => setPermanentDeleteId(null) },
              );
            }}
            className={dialogBtnDestructive}
          >
            {deleteMutation.isPending
              ? messages.common.saving
              : shopsMessages.table.permanentDelete}
          </button>
        </Dialog.Footer>
      </Dialog>

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
