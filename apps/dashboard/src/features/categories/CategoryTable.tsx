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
    <img
      src={src}
      alt=""
      className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg";
      }}
    />
  );
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        id: "image",
        className: "w-14",
        cell: (cat) => <CategoryThumb category={cat} />,
      },
      {
        id: "name",
        header: "Name",
        cell: (cat) => <span className="font-medium text-gray-900">{cat.name}</span>,
      },
      {
        id: "slug",
        header: "Slug",
        cell: (cat) => <span className="font-mono text-gray-400">{cat.slug}</span>,
      },
      {
        id: "shopCount",
        header: "Shops",
        className: "w-20",
        cell: (cat) => <span className="text-gray-500">{cat.shopCount ?? "–"}</span>,
      },
      {
        id: "actions",
        className: "w-48",
        cell: (cat) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onEdit(cat.id)}
              className="h-8 px-3 border border-gray-200 rounded-control text-gray-600 hover:border-gray-300 transition-colors"
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

  return <DataTable columns={columns} data={categories} getRowKey={(c) => c.id} />;
}
