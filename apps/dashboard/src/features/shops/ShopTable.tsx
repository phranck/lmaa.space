import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import type { Shop } from "@lmaa/shared";
import { useMemo } from "react";

interface ShopTableProps {
  shops: Shop[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ShopTable({ shops, onEdit, onDelete }: ShopTableProps) {
  const columns = useMemo<ColumnDef<Shop>[]>(
    () => [
      {
        id: "name",
        header: "Shop",
        cell: (shop) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{shop.name}</p>
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
            <span className="text-gray-300">–</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {shop.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs"
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
        cell: (shop) => <span className="text-sm text-gray-500">{shop.region || "–"}</span>,
      },
      {
        id: "actions",
        className: "w-44",
        cell: (shop) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onEdit(shop.id)}
              className="h-8 px-3 border border-gray-200 rounded-control text-gray-600 text-sm hover:border-gray-300 transition-colors"
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

  return <DataTable columns={columns} data={shops} getRowKey={(s) => s.id} stickyHeader />;
}
