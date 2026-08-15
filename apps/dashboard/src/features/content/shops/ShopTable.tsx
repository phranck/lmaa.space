import {
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  HeartIcon,
  InfoIcon,
  PauseCircleIcon,
  SealWarningIcon,
  TrashIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { memo, useMemo } from "react";

import { REGION_CODES, type AdminShopListItem, type ShopSummary } from "@lmaa/shared";

import { Badge } from "@/components/ui/Badge.tsx";
import { ShopCategoryBadges } from "@/components/ui/ShopCategoryBadges.tsx";
import { type ColumnDef, DataTable, type SortState } from "@/components/ui/Table.tsx";
import { TableActionButton } from "@/components/ui/TableActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { getRegionOptions } from "@/features/content/shops/shop-form-i18n.ts";
import { FRONTEND_URL } from "@/lib/env.ts";

interface ShopTableProps {
  shops: AdminShopListItem[];
  onEdit: (shop: AdminShopListItem) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
}

const VisibilityBadge = memo(function VisibilityBadge({
  visibility,
}: {
  visibility: ShopSummary["visibility"];
}) {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;

  if (visibility === "onhold") {
    return (
      <Badge
        colorClass="bg-amber-500/10 text-amber-400"
        className="shrink-0"
        icon={<PauseCircleIcon weight="duotone" className="size-3.5" />}
      >
        {shopsMessages.table.statusOnhold}
      </Badge>
    );
  }
  if (visibility === "deleted") {
    return (
      <Badge
        colorClass="bg-red-500/10 text-red-400"
        className="shrink-0"
        icon={<TrashIcon weight="duotone" className="size-3.5" />}
      >
        {shopsMessages.table.statusDeleted}
      </Badge>
    );
  }
  if (visibility === "rejected") {
    return (
      <Badge
        colorClass="bg-orange-500/10 text-orange-400"
        className="shrink-0"
        icon={<XCircleIcon weight="duotone" className="size-3.5" />}
      >
        {shopsMessages.table.statusRejected}
      </Badge>
    );
  }
  return null;
});

function formatReminderTitle(reminder: NonNullable<AdminShopListItem["reminder"]>) {
  const formattedDate = new Date(reminder.remindAt).toLocaleString("de-DE");
  return `Erinnerung: ${formattedDate}${reminder.note ? ` - ${reminder.note}` : ""}`;
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
                <EyeIcon weight="duotone" className="size-3.5 shrink-0 text-emerald-500" />
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
              {shop.needsReview && (
                <Badge
                  colorClass="bg-[var(--ds-badge-review-bg)] text-[var(--ds-badge-review-text)]"
                  className="shrink-0"
                  icon={<SealWarningIcon weight="duotone" className="size-3.5" />}
                >
                  {shopsMessages.table.needsReview}
                </Badge>
              )}
              {shop.reminder && (
                <span
                  title={formatReminderTitle(shop.reminder)}
                  className="shrink-0 text-amber-400"
                >
                  <ClockIcon weight="duotone" className="size-3.5" />
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
                <Badge colorClass="bg-[color-mix(in_oklab,var(--ds-surface-hover)_65%,var(--ds-border)_35%)] text-[var(--ds-text-muted)]">
                  {shopsMessages.table.categoriesMore.replace("{n}", String(remainingCount))}
                </Badge>
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
              {shop.region
                .slice()
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
        id: "likes",
        header: shopsMessages.table.likes,
        className: "w-20",
        sortKey: (shop) => shop.likeCount,
        cell: (shop) =>
          shop.likeCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm text-red-400">
              <HeartIcon weight="duotone" className="size-3.5" />
              {shop.likeCount}
            </span>
          ) : (
            <span className="text-sm text-[var(--ds-text-subtle)]">0</span>
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
                    `${FRONTEND_URL}/rejected/${shop.rejectionToken}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
                icon={<InfoIcon weight="duotone" className="size-3.5" />}
                label={shopsMessages.table.rejectionInfo}
              />
            )}
            <TableActionButton
              onClick={() => onEdit(shop)}
              icon={<FileTextIcon weight="duotone" className="size-3.5" />}
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
