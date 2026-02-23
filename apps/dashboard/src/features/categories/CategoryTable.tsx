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
  // Enrich each category with a derived "letter" field for grouping
  const data = useMemo(
    () => categories.map((c) => ({ ...c, letter: c.name.charAt(0).toUpperCase() })),
    [categories],
  );

  type Row = (typeof data)[number];

  const columns = useMemo<MRT_ColumnDef<Row>[]>(
    () => [
      {
        id: "letter",
        accessorKey: "letter",
        header: "Buchstabe",
        size: 60,
        enableHiding: false,
        GroupedCell: ({ cell }) => (
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {cell.getValue<string>()}
          </span>
        ),
      },
      {
        id: "image",
        header: "",
        size: 56,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => <CategoryThumb category={row.original} />,
      },
      {
        accessorKey: "name",
        header: "Name",
        size: 200,
        Cell: ({ cell }) => (
          <span className="font-medium text-gray-900">{cell.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "slug",
        header: "Slug",
        size: 200,
        Cell: ({ cell }) => (
          <span className="text-sm font-mono text-gray-500">{cell.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "shopCount",
        header: "Shops",
        size: 80,
        Cell: ({ cell }) => (
          <span className="text-sm text-gray-500">{cell.getValue<number>() ?? 0}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 160,
        enableSorting: false,
        enableColumnFilter: false,
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
    data,
    // Grouping by first letter
    enableGrouping: true,
    enableColumnDragging: false,
    enableColumnOrdering: false,
    // Hide the grouped "letter" column from normal display
    initialState: {
      grouping: ["letter"],
      expanded: true,
      columnVisibility: { letter: false },
      density: "compact",
    },
    // Disable features we don't need
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    enableColumnFilters: false,
    enableFilters: false,
    enableHiding: false,
    enablePagination: false,
    enableSorting: false,
    enableStickyHeader: false,
    enableColumnActions: false,
    // MUI theming overrides via sx
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "var(--radius-card)",
        border: "1px solid #f3f4f6",
        overflow: "hidden",
      },
    },
    muiTableProps: {
      sx: { tableLayout: "auto" },
    },
    muiTableHeadProps: {
      sx: { display: "none" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: row.getIsGrouped()
        ? {
            backgroundColor: "transparent",
            "&:hover": { backgroundColor: "transparent" },
          }
        : {
            "&:hover": { backgroundColor: "#f9fafb" },
            cursor: "default",
          },
    }),
    muiTableBodyCellProps: ({ row }) => ({
      sx: {
        padding: row.getIsGrouped() ? "4px 12px 2px" : "8px 12px",
        borderBottom: "1px solid #f3f4f6",
        fontSize: "0.875rem",
      },
    }),
  });

  return <MaterialReactTable table={table} />;
}
