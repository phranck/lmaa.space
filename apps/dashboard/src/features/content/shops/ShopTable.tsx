import {
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  InfoIcon,
  MapPinIcon,
  PauseCircleIcon,
  SealWarningIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";

import { REGION_CODES, type AdminShopListItem, type ShopSummary } from "@lmaa/shared";

import { ShopCategoryBadges } from "@/components/ui/ShopCategoryBadges.tsx";
import { type ColumnDef, DataTable, type SortState } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { getRegionOptions } from "@/features/content/shops/shop-form-i18n.ts";

interface ShopTableProps {
  shops: AdminShopListItem[];
  onEdit: (shop: AdminShopListItem) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
}

function VisibilityBadge({ visibility }: { visibility: ShopSummary["visibility"] }) {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;

  if (visibility === "onhold") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400">
        <PauseCircleIcon weight="duotone" className="w-3 h-3" />
        {shopsMessages.table.statusOnhold}
      </span>
    );
  }
  if (visibility === "deleted") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400">
        <TrashIcon weight="duotone" className="w-3 h-3" />
        {shopsMessages.table.statusDeleted}
      </span>
    );
  }
  if (visibility === "rejected") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/10 text-orange-400">
        <XCircleIcon weight="duotone" className="w-3 h-3" />
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
export function ShopTable({ shops, onEdit, sort, onSortChange }: ShopTableProps) {
  const { locale, messages } = useI18n();
  const shopsMessages = messages.shops;
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
                <EyeIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
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
              {shop.headquarters?.latitude != null && shop.headquarters?.longitude != null && (
                <MapPinIcon weight="duotone" className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)]" />
              )}
              {shop.needsReview && (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--ds-badge-review-bg)] text-[var(--ds-badge-review-text)]">
                  <SealWarningIcon weight="duotone" className="w-3 h-3" />
                  {shopsMessages.table.needsReview}
                </span>
              )}
              {shop.reminder && (
                <span
                  title={`Erinnerung: ${new Date(shop.reminder.remindAt).toLocaleString("de-DE")}${shop.reminder.note ? ` – ${shop.reminder.note}` : ""}`}
                  className="shrink-0 text-amber-400"
                >
                  <ClockIcon weight="duotone" className="w-3.5 h-3.5" />
                </span>
              )}
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
        cell: (shop) => {
          const visibleCategories = shop.categories.slice(0, 3);
          const remainingCount = shop.categories.length - visibleCategories.length;
          return (
            <div className="flex flex-wrap items-center gap-1">
              <ShopCategoryBadges categories={visibleCategories} emptyLabel="–" />
              {remainingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[color-mix(in_oklab,var(--ds-surface-hover)_65%,var(--ds-border)_35%)] text-[var(--ds-text-muted)] text-xs">
                  {shopsMessages.table.categoriesMore.replace("{n}", String(remainingCount))}
                </span>
              )}
            </div>
          );
        },
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
        className: "w-36",
        cell: (shop) => (
          <div className="flex gap-2 justify-end">
            {shop.visibility === "rejected" && shop.rejectionToken && (
              <TableActionButton
                variant="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `${import.meta.env.VITE_FRONTEND_URL ?? (import.meta.env.DEV ? "http://localhost:4321" : "https://lmaa.space")}/rejected/${shop.rejectionToken}`,
                    "_blank",
                  );
                }}
                icon={<InfoIcon weight="duotone" className="w-3.5 h-3.5" />}
                label={shopsMessages.table.rejectionInfo}
              />
            )}
            <TableActionButton
              onClick={() => onEdit(shop)}
              icon={<FileTextIcon weight="duotone" className="w-3.5 h-3.5" />}
              label={shopsMessages.table.edit}
            />
          </div>
        ),
      },
    ],
    [onEdit, regionOptions, shopsMessages],
  );

  return (
    <DataTable
      columns={columns}
      data={shops}
      getRowKey={(s: AdminShopListItem) => s.id}
      stickyHeader
      sort={sort}
      onSortChange={onSortChange}
    />
  );
}
