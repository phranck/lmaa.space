import { CaretDownIcon, CaretUpIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import React, { useMemo, useState } from "react";

// ─── Group type ───────────────────────────────────────────────────────────────

/**
 * Describes a named group of rows for use with the `groups` prop of `DataTable`.
 *
 * @typeParam T - Row object shape.
 */
export interface DataTableGroup<T> {
  id: string;
  /** Rendered as a single-cell row spanning all columns above the group's rows. */
  header: ReactNode;
  rows: T[];
}

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
    <tr className={`hover:bg-[var(--ds-row-hover)] ${className}`} {...props} />
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
  data?: T[];
  /** When provided, rows are rendered in named groups with a section-header row before each group. `data` is ignored. */
  groups?: DataTableGroup<T>[];
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
  data = [],
  groups,
  getRowKey,
  getRowClassName,
  stickyHeader = false,
  initialSort = null,
  sort: controlledSort,
  onSortChange,
  allowUnsorted = true,
}: DataTableProps<T>) {
  const [uncontrolledSort, setUncontrolledSort] = useState<SortState | null>(initialSort);
  const [prevInitialSort, setPrevInitialSort] = useState(initialSort);
  if (initialSort !== prevInitialSort) {
    setPrevInitialSort(initialSort);
    setUncontrolledSort(initialSort);
  }
  const sort = controlledSort ?? uncontrolledSort;

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

  function sortRows(rows: T[]): T[] {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortKey) return rows;
    return [...rows].sort((a, b) => {
      // biome-ignore lint/style/noNonNullAssertion: col is confirmed to have sortKey above
      const av = col.sortKey!(a);
      // biome-ignore lint/style/noNonNullAssertion: col is confirmed to have sortKey above
      const bv = col.sortKey!(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "de", {
              numeric: true,
              sensitivity: "base",
            });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }

  const sorted = useMemo(
    () => sortRows(data),
    [allowUnsorted, data, sort, columns],
  );

  const sortedGroups = useMemo(
    () => groups?.map((g) => ({ ...g, rows: sortRows(g.rows) })),
    [allowUnsorted, groups, sort, columns],
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
                  className="inline-flex items-center gap-1.5 hover:text-[var(--ds-text)]"
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
        {sortedGroups
          ? (() => {
              let stripeIndex = 0;
              return sortedGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <tr
                    className="bg-[var(--ds-surface-inset)] hover:bg-transparent"
                  >
                    <td
                      colSpan={columns.length}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]"
                    >
                      {group.header}
                    </td>
                  </tr>
                  {group.rows.map((row) => {
                    const idx = stripeIndex++;
                    return (
                      <TableRow
                        key={getRowKey(row)}
                        className={`${idx % 2 === 1 ? "bg-[var(--ds-row-stripe)]" : ""} ${getRowClassName?.(row) ?? ""}`}
                      >
                        {columns.map((col) => (
                          <Td key={col.id} className={col.cellClassName ?? col.className ?? ""}>
                            {col.cell(row)}
                          </Td>
                        ))}
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ));
            })()
          : sorted.map((row, index) => (
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
