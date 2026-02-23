import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import type { ShopSummary } from "@lmaa/shared";
import { useMemo } from "react";

interface ShopTableProps {
  shops: ShopSummary[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ShopTable({ shops, onEdit, onDelete }: ShopTableProps) {
  const columns = useMemo<ColumnDef<ShopSummary>[]>(
    () => [
      {
        id: "name",
        header: "Shop",
        cell: (shop) => (
          <div className="min-w-0">
            <p className="font-medium text-[var(--ds-text)] truncate">{shop.name}</p>
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
        header: "Kategorien",
        cell: (shop) =>
          shop.categories.length === 0 ? (
            <span className="text-[var(--ds-text-subtle)]">–</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {shop.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="px-2 py-0.5 rounded-full bg-[var(--ds-bg-elevated)] text-[var(--ds-text-muted)] text-xs"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          ),
      },
      {
        id: "region",
        header: "Region",
        className: "w-36",
        cell: (shop) => (
          <span className="text-sm text-[var(--ds-text-muted)]">{shop.region || "–"}</span>
        ),
      },
      {
        id: "actions",
        className: "w-44",
        cell: (shop) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onEdit(shop.id)}
              className="h-8 px-3 border border-[var(--ds-border)] rounded-control text-[var(--ds-text-muted)] text-sm hover:border-[var(--ds-border-strong)] transition-colors"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => onDelete(shop.id)}
              className="h-8 px-3 border border-red-200 rounded-control text-red-500 text-sm hover:border-red-300 transition-colors"
            >
              Löschen
            </button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return (
    <DataTable columns={columns} data={shops} getRowKey={(s: ShopSummary) => s.id} stickyHeader />
  );
}
