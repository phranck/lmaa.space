import { CaretDownIcon, CaretUpIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { useEffect, useMemo, useState } from "react";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full">
      <table className={`w-full border-collapse text-sm ${className}`} {...props} />
    </div>
  );
}

function TableHead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`text-left ${className}`} {...props} />;
}

function TableBody({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={`divide-y divide-[var(--ds-table-row-separator)] bg-[var(--ds-surface)] ${className}`}
      {...props}
    />
  );
}

function TableRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`hover:bg-[var(--ds-row-hover)] transition-colors ${className}`} {...props} />
  );
}

function Th({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`section-header px-4 ${className}`} {...props} />;
}

function Td({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-2 align-middle ${className}`} {...props} />;
}

// ─── Column-based DataTable ───────────────────────────────────────────────────

/**
 * Declarative column definition for the generic `DataTable`.
 *
 * @typeParam T - Row object shape.
 */
export interface ColumnDef<T> {
  id: string;
  header?: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Provide a value extractor to make the column sortable. */
  sortKey?: (row: T) => string | number;
}

type SortDir = "asc" | "desc";
export interface SortState {
  id: string;
  dir: SortDir;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  getRowClassName?: (row: T) => string;
  /** Keeps the header visible while scrolling. Requires the app header height as top offset. */
  stickyHeader?: boolean;
  /** Optional default sort applied on first render. */
  initialSort?: SortState | null;
  /** Optional controlled sort state. */
  sort?: SortState | null;
  /** Called when the sort state changes. */
  onSortChange?: (sort: SortState | null) => void;
  /** If false, sorting toggles between asc/desc and never resets to unsorted. */
  allowUnsorted?: boolean;
}

/**
 * Generic sortable table component used throughout the dashboard.
 *
 * Hidden behavior: clicking a sortable header cycles `asc -> desc -> unsorted`.
 *
 * @typeParam T - Row object shape.
 * @param props - Column config, row data and key extractors.
 * @returns Rendered data table.
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  getRowClassName,
  stickyHeader = false,
  initialSort = null,
  sort: controlledSort,
  onSortChange,
  allowUnsorted = true,
}: DataTableProps<T>) {
  const [uncontrolledSort, setUncontrolledSort] = useState<SortState | null>(initialSort);
  const sort = controlledSort ?? uncontrolledSort;

  useEffect(() => {
    if (controlledSort !== undefined) return;
    setUncontrolledSort(initialSort);
  }, [controlledSort, initialSort]);

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortKey) return;
    const nextSort =
      !sort || sort.id !== col.id
        ? { id: col.id, dir: "asc" as const }
        : sort.dir === "asc"
          ? { id: col.id, dir: "desc" as const }
          : allowUnsorted
            ? null
            : { id: col.id, dir: "asc" as const };
    if (controlledSort !== undefined) {
      onSortChange?.(nextSort);
      return;
    }
    setUncontrolledSort(nextSort);
    onSortChange?.(nextSort);
  }

  const sorted = useMemo(
    () =>
      sort
        ? [...data].sort((a, b) => {
            const col = columns.find((c) => c.id === sort.id);
            if (!col?.sortKey) return 0;
            const av = col.sortKey(a);
            const bv = col.sortKey(b);
            const cmp =
              typeof av === "number" && typeof bv === "number"
                ? av - bv
                : String(av).localeCompare(String(bv), "de", {
                    numeric: true,
                    sensitivity: "base",
                  });
            return sort.dir === "asc" ? cmp : -cmp;
          })
        : data,
    [allowUnsorted, data, sort, columns],
  );

  return (
    <Table>
      <TableHead
        className={stickyHeader ? "sticky -top-3 z-10 shadow-[0_1px_0_var(--ds-border)]" : ""}
      >
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <Th
              key={col.id}
              aria-sort={
                col.sortKey
                  ? sort?.id === col.id
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined
              }
              className={`${col.headerClassName ?? col.className ?? ""} ${col.sortKey ? "select-none" : ""}`}
            >
              {col.sortKey ? (
                <button
                  type="button"
                  onClick={() => handleSort(col)}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--ds-text)] transition-colors"
                >
                  {col.header}
                  {sort?.id === col.id ? (
                    sort.dir === "asc" ? (
                      <CaretUpIcon weight="duotone" className="w-3 h-3 shrink-0" />
                    ) : (
                      <CaretDownIcon weight="duotone" className="w-3 h-3 shrink-0" />
                    )
                  ) : (
                    <CaretUpDownIcon weight="duotone" className="w-3 h-3 shrink-0 opacity-40" />
                  )}
                </button>
              ) : (
                col.header
              )}
            </Th>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row, index) => (
          <TableRow
            key={getRowKey(row)}
            className={`${index % 2 === 1 ? "bg-[var(--ds-row-stripe)]" : ""} ${getRowClassName?.(row) ?? ""}`}
          >
            {columns.map((col) => (
              <Td key={col.id} className={col.cellClassName ?? col.className ?? ""}>
                {col.cell(row)}
              </Td>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
