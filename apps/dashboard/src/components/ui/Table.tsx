import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { useState } from "react";
import { SFChevronDown, SFChevronUp, SFChevronUpChevronDown } from "sf-symbols-lib/monochrome";

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
      className={`divide-y divide-[var(--ds-border-subtle)] bg-[var(--ds-surface)] ${className}`}
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
  return (
    <th
      className={`section-header px-4 ${className}`}
      {...props}
    />
  );
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
interface SortState {
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
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortKey) return;
    setSort((prev) => {
      if (!prev || prev.id !== col.id) return { id: col.id, dir: "asc" };
      if (prev.dir === "asc") return { id: col.id, dir: "desc" };
      return null; // reset
    });
  }

  const sorted = sort
    ? [...data].sort((a, b) => {
        const col = columns.find((c) => c.id === sort.id);
        if (!col?.sortKey) return 0;
        const av = col.sortKey(a);
        const bv = col.sortKey(b);
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "de");
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : data;

  return (
    <Table>
      <TableHead
        className={stickyHeader ? "sticky top-14 z-10 shadow-[0_1px_0_var(--ds-border)]" : ""}
      >
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <Th
              key={col.id}
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
                      <SFChevronUp className="w-3 h-3 shrink-0" />
                    ) : (
                      <SFChevronDown className="w-3 h-3 shrink-0" />
                    )
                  ) : (
                    <SFChevronUpChevronDown className="w-3 h-3 shrink-0 opacity-40" />
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
        {sorted.map((row) => (
          <TableRow key={getRowKey(row)} className={getRowClassName?.(row)}>
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
