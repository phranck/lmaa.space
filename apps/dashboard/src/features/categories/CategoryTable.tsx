import type { Category } from "@lmaa/shared";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
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
  const columns = useMemo<MRT_ColumnDef<Category>[]>(
    () => [
      {
        id: "image",
        header: "",
        size: 56,
        enableSorting: false,
        Cell: ({ row }) => <CategoryThumb category={row.original} />,
      },
      {
        accessorKey: "name",
        header: "Name",
        Cell: ({ cell }) => (
          <span className="font-medium text-gray-900">{cell.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "slug",
        header: "Slug",
        Cell: ({ cell }) => (
          <span className="text-sm font-mono text-gray-400">{cell.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "shopCount",
        header: "Shops",
        size: 80,
        Cell: ({ cell }) => {
          const v = cell.getValue<number | undefined>();
          return <span className="text-sm text-gray-500">{v ?? "–"}</span>;
        },
      },
      {
        id: "actions",
        header: "",
        size: 200,
        enableSorting: false,
        Cell: ({ row }) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onEdit(row.original.id)}
              className="h-8 px-3 text-sm border border-gray-200 rounded-control text-gray-600 hover:border-gray-300 transition-colors"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => onDelete(row.original.id)}
              className="h-8 px-3 text-sm border border-red-200 rounded-control text-red-500 hover:border-red-300 transition-colors"
            >
              Löschen
            </button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  const table = useMaterialReactTable({
    columns,
    data: categories,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableFilters: false,
    enableHiding: false,
    enablePagination: false,
    enableSorting: false,
    enableStickyHeader: false,
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    initialState: { density: "comfortable" },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        width: "100%",
        borderRadius: "var(--radius-card)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      },
    },
    muiTableContainerProps: {
      sx: { width: "100%" },
    },
    muiTableProps: {
      sx: { width: "100%", tableLayout: "fixed" },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "#e5e7eb",
        color: "#374151",
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderBottom: "1px solid #d1d5db",
        padding: "10px 16px",
      },
    },
    muiTableBodyRowProps: {
      sx: { "&:hover td": { backgroundColor: "#f9fafb" }, cursor: "default" },
    },
    muiTableBodyCellProps: {
      sx: {
        padding: "10px 16px",
        borderBottom: "1px solid #f3f4f6",
        fontSize: "0.875rem",
      },
    },
  });

  return <MaterialReactTable table={table} />;
}
