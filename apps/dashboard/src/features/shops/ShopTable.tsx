import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { REGION_CODES, type ShopSummary } from "@lmaa/shared";
import { REGION_OPTIONS } from "@lmaa/ui";
import { useMemo } from "react";
import { SFEyeFill, SFPauseCircleFill, SFTrashFill } from "sf-symbols-lib/monochrome";

interface ShopTableProps {
  shops: ShopSummary[];
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
  onHold?: (id: number) => void;
  onRestore?: (id: number) => void;
}

function VisibilityBadge({ visibility }: { visibility: ShopSummary["visibility"] }) {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;

  if (visibility === "onhold") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
        <SFPauseCircleFill className="w-3 h-3" />
        {shopsMessages.table.statusOnhold}
      </span>
    );
  }
  if (visibility === "deleted") {
    return (
      <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
        <SFTrashFill className="w-3 h-3" />
        {shopsMessages.table.statusDeleted}
      </span>
    );
  }
  return null;
}

export function ShopTable({ shops, onEdit, onDelete, onHold, onRestore }: ShopTableProps) {
  const { messages } = useI18n();
  const shopsMessages = messages.shops;
  const columns = useMemo<ColumnDef<ShopSummary>[]>(
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
                    : shop.visibility === "onhold"
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
        cell: (shop) =>
          shop.categories.length === 0 ? (
            <span className="text-[var(--ds-text-subtle)]">–</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {shop.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="px-2 py-0.5 rounded-[4px] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)] text-xs"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          ),
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
                  const opt = REGION_OPTIONS.find((o) => o.code === code);
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
                  onClick={() => onEdit(shop.id)}
                  className="h-9 px-3 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  {shopsMessages.table.edit}
                </button>
                {onHold && (
                  <button
                    type="button"
                    onClick={() => onHold(shop.id)}
                    className="h-9 px-3 border border-[var(--ds-btn-warning-border)] rounded-control text-[var(--ds-btn-warning-text)] text-sm hover:border-[var(--ds-btn-warning-hover-border)] hover:bg-[var(--ds-btn-warning-hover-bg)] transition-colors"
                  >
                    {shopsMessages.table.putOnHold}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(shop.id)}
                    className="h-9 px-3 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                  >
                    {shopsMessages.table.delete}
                  </button>
                )}
              </>
            )}
            {shop.visibility === "onhold" && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(shop.id)}
                  className="h-9 px-3 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                >
                  {shopsMessages.table.edit}
                </button>
                {onRestore && (
                  <button
                    type="button"
                    onClick={() => onRestore(shop.id)}
                    className="h-9 px-3 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors"
                  >
                    {shopsMessages.table.restore}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(shop.id)}
                    className="h-9 px-3 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                  >
                    {shopsMessages.table.delete}
                  </button>
                )}
              </>
            )}
            {shop.visibility === "deleted" && onRestore && (
              <button
                type="button"
                onClick={() => onRestore(shop.id)}
                className="h-9 px-3 border border-[var(--ds-btn-success-border)] rounded-control text-[var(--ds-btn-success-text)] text-sm hover:border-[var(--ds-btn-success-hover-border)] hover:bg-[var(--ds-btn-success-hover-bg)] transition-colors"
              >
                {shopsMessages.table.restore}
              </button>
            )}
          </div>
        ),
      },
    ],
    [onDelete, onEdit, onHold, onRestore, shopsMessages],
  );

  return (
    <DataTable columns={columns} data={shops} getRowKey={(s: ShopSummary) => s.id} stickyHeader />
  );
}
