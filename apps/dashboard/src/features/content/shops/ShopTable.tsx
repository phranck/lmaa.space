import { useMemo, useState } from "react";
import SFArrowCounterclockwise from "sf-symbols-lib/monochrome/SFArrowCounterclockwise";
import SFEyeFill from "sf-symbols-lib/monochrome/SFEyeFill";
import SFInfoCircleFill from "sf-symbols-lib/monochrome/SFInfoCircleFill";
import SFLongTextPageAndPencilFill from "sf-symbols-lib/monochrome/SFLongTextPageAndPencilFill";
import SFPauseCircleFill from "sf-symbols-lib/monochrome/SFPauseCircleFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFXmarkCircleFill from "sf-symbols-lib/monochrome/SFXmarkCircleFill";

import { REGION_CODES, type AdminShopListItem, type ShopSummary } from "@lmaa/shared";

import { ShopCategoryBadges } from "@/components/ui/ShopCategoryBadges.tsx";
import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { getRegionOptions } from "@/features/content/shops/shop-form-i18n.ts";
import { ShopDeletionInfoOverlay } from "@/features/content/shops/ShopDeletionInfoOverlay.tsx";

interface ShopTableProps {
  shops: AdminShopListItem[];
  onEdit: (shop: AdminShopListItem) => void;
  onDelete?: (id: number) => void;
  onPermanentDelete?: (id: number) => void;
  onHold?: (id: number) => void;
  onRestore?: (id: number) => void;
  onUpdateReason?: (id: number, reason: string | null) => Promise<void>;
}

function VisibilityBadge({ visibility }: { visibility: ShopSummary["visibility"] }) {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;

  if (visibility === "onhold") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400">
        <SFPauseCircleFill className="w-3 h-3" />
        {shopsMessages.table.statusOnhold}
      </span>
    );
  }
  if (visibility === "deleted") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400">
        <SFTrashFill className="w-3 h-3" />
        {shopsMessages.table.statusDeleted}
      </span>
    );
  }
  if (visibility === "rejected") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-400">
        <SFXmarkCircleFill className="w-3 h-3" />
        {shopsMessages.table.statusRejected}
      </span>
    );
  }
  return null;
}

/**
 * Table presentation of shop rows with moderation actions.
 *
 * @param props - Shop rows and row-level action callbacks.
 * @returns Data table with sticky header.
 */
export function ShopTable({
  shops,
  onEdit,
  onDelete,
  onPermanentDelete,
  onHold,
  onRestore,
  onUpdateReason,
}: ShopTableProps) {
  const { locale, messages } = useI18n();
  const shopsMessages = messages.shops;
  const [infoShop, setInfoShop] = useState<ShopSummary | null>(null);
  const regionOptions = getRegionOptions(locale);
  const columns = useMemo<ColumnDef<AdminShopListItem>[]>(
    () => [
      {
        id: "name",
        header: shopsMessages.table.shop,
        sortKey: (shop) => shop.name.toLowerCase(),
        cell: (shop) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {shop.visibility === "public" && (
                <SFEyeFill className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              )}
              <p
                className={`font-medium truncate ${
                  shop.visibility === "deleted"
                    ? "text-[var(--ds-text-subtle)] line-through"
                    : shop.visibility === "onhold" || shop.visibility === "rejected"
                      ? "text-[var(--ds-text-muted)]"
                      : "text-[var(--ds-text)]"
                }`}
              >
                {shop.name}
              </p>
              <VisibilityBadge visibility={shop.visibility} />
            </div>
            <a
              href={shop.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-primary)] hover:underline truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {shop.url}
            </a>
          </div>
        ),
      },
      {
        id: "categories",
        header: shopsMessages.table.categories,
        cell: (shop) => <ShopCategoryBadges categories={shop.categories} emptyLabel="–" />,
      },
      {
        id: "region",
        header: shopsMessages.table.region,
        className: "w-36",
        sortKey: (shop) => (shop.region ?? []).join(", "),
        cell: (shop) =>
          shop.region?.length ? (
            <div className="flex items-center gap-1.5">
              {[...shop.region]
                .sort((a, b) => REGION_CODES.indexOf(a) - REGION_CODES.indexOf(b))
                .map((code) => {
                  const opt = regionOptions.find((o) => o.code === code);
                  return (
                    <span key={code} title={opt?.name ?? code} className="text-base leading-none">
                      {opt?.flag ?? code}
                    </span>
                  );
                })}
            </div>
          ) : (
            <span className="text-sm text-[var(--ds-text-muted)]">–</span>
          ),
      },
      {
        id: "actions",
        className: "w-56",
        cell: (shop) => (
          <div className="flex gap-2 justify-end">
            {shop.visibility === "public" && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(shop)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {shopsMessages.table.edit}
                </button>
                {onHold && (
                  <button
                    type="button"
                    onClick={() => onHold(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-warning-border)] rounded-control text-[var(--ds-btn-warning-text)] text-sm hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)] transition-colors"
                  >
                    <SFPauseCircleFill className="w-3.5 h-3.5" />
                    {shopsMessages.table.putOnHold}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                  >
                    <SFTrashFill className="w-3.5 h-3.5" />
                    {shopsMessages.table.delete}
                  </button>
                )}
              </>
            )}
            {shop.visibility === "onhold" && (
              <>
                {onRestore && (
                  <button
                    type="button"
                    onClick={() => onRestore(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors"
                  >
                    <SFArrowCounterclockwise className="w-3.5 h-3.5" />
                    {shopsMessages.table.restore}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(shop)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {shopsMessages.table.edit}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                  >
                    <SFTrashFill className="w-3.5 h-3.5" />
                    {shopsMessages.table.delete}
                  </button>
                )}
              </>
            )}
            {shop.visibility === "deleted" && (
              <>
                {onRestore && (
                  <button
                    type="button"
                    onClick={() => onRestore(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors"
                  >
                    <SFArrowCounterclockwise className="w-3.5 h-3.5" />
                    {shopsMessages.table.restore}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInfoShop(shop)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-border)] rounded-control text-[var(--ds-text-muted)] text-sm hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors"
                >
                  <SFInfoCircleFill className="w-3.5 h-3.5" />
                  {shopsMessages.table.deletionInfo}
                </button>
                {onPermanentDelete && (
                  <button
                    type="button"
                    onClick={() => onPermanentDelete(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                  >
                    <SFTrashFill className="w-3.5 h-3.5" />
                    {shopsMessages.table.permanentDelete}
                  </button>
                )}
              </>
            )}
            {shop.visibility === "rejected" && (
              <>
                {shop.rejectionToken && (
                  <button
                    type="button"
                    onClick={() => {
                      const base =
                        import.meta.env.VITE_FRONTEND_URL ??
                        (import.meta.env.DEV ? "http://localhost:4321" : "https://lmaa.space");
                      window.open(`${base}/rejected/${shop.rejectionToken}`, "_blank");
                    }}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                  >
                    <SFInfoCircleFill className="w-3.5 h-3.5" />
                    {shopsMessages.table.rejectionInfo}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(shop)}
                  className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
                  {shopsMessages.table.edit}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(shop.id)}
                    className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                  >
                    <SFTrashFill className="w-3.5 h-3.5" />
                    {shopsMessages.table.delete}
                  </button>
                )}
              </>
            )}
          </div>
        ),
      },
    ],
    [onDelete, onPermanentDelete, onEdit, onHold, onRestore, regionOptions, shopsMessages],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={shops}
        getRowKey={(s: AdminShopListItem) => s.id}
        stickyHeader
      />
      {infoShop && (
        <ShopDeletionInfoOverlay
          shop={infoShop}
          onClose={() => setInfoShop(null)}
          onUpdateReason={
            onUpdateReason ? (reason) => onUpdateReason(infoShop.id, reason) : undefined
          }
        />
      )}
    </>
  );
}
