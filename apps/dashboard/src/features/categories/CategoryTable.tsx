import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import type { Category } from "@lmaa/shared";
import { useMemo } from "react";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

function CategoryThumb({ category }: { category: Category }) {
  const src = category.imageUrl ?? `/images/${category.slug}.jpg`;
  return (
    <div className="w-28 h-[63px] rounded-lg overflow-hidden bg-[var(--ds-bg-elevated)] shrink-0">
      <img
        src={src}
        alt=""
        className="block w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg";
        }}
      />
    </div>
  );
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        id: "image",
        className: "w-32",
        cell: (cat) => <CategoryThumb category={cat} />,
      },
      {
        id: "name",
        header: "Name",
        cell: (cat) => <span className="font-medium text-[var(--ds-text)]">{cat.name}</span>,
      },
      {
        id: "slug",
        header: "Slug",
        cell: (cat) => <span className="font-mono text-[var(--ds-text-subtle)]">{cat.slug}</span>,
      },
      {
        id: "shopCount",
        header: "Shops",
        className: "w-20",
        cell: (cat) => <span className="text-[var(--ds-text-muted)]">{cat.shopCount ?? "–"}</span>,
      },
      {
        id: "actions",
        className: "w-48",
        cell: (cat) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onEdit(cat.id)}
              className="h-8 px-3 border border-[var(--ds-border)] rounded-control text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => onDelete(cat.id)}
              className="h-8 px-3 border border-red-200 rounded-control text-red-500 hover:border-red-300 transition-colors"
            >
              Löschen
            </button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  return <DataTable columns={columns} data={categories} getRowKey={(c) => c.id} stickyHeader />;
}
