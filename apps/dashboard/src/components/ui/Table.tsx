import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import React, { useCallback, useMemo, useReducer } from "react";

import { TableSortHeader, type TableSortDirection } from "@/components/ui/DashboardControls.tsx";

function getTableSortAriaSort(direction: TableSortDirection) {
  if (direction === "asc") return "ascending";
  if (direction === "desc") return "descending";
  return "none";
}

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

/**
 * The table element every dashboard table is built on.
 *
 * @remarks
 * Laid out `fixed` rather than `auto`. An automatic layout sizes a table by its
 * contents and reports that width upwards, so one long URL in one row makes the
 * whole table wider than the page and the last columns end up past the right
 * edge where nobody scrolls to find them. A fixed layout takes the widths the
 * columns declare, gives what is left to the columns that declare none, and
 * lets a cell's own `truncate` do the shortening.
 *
 * That means a column's width is a decision rather than an outcome: a column
 * whose content must stay whole needs a width wide enough for it, and a column
 * that may be shortened needs `truncate` on what it renders.
 */
function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full">
      <table className={`w-full table-fixed border-collapse text-sm ${className}`} {...props} />
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
  return <tr className={`hover:bg-[var(--ds-row-hover)] ${className}`} {...props} />;
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

const tableSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const EMPTY_TABLE_ROWS: never[] = [];

function updateSortState(_: SortState | null, nextSort: SortState | null) {
  return nextSort;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data?: T[];
  /** When provided, rows are rendered in named groups with a section-header row before each group. `data` is ignored. */
  groups?: DataTableGroup<T>[];
  getRowKey: (row: T) => string | number;
  getRowClassName?: (row: T) => string;
  getRowProps?: (row: T) => HTMLAttributes<HTMLTableRowElement>;
  /** Keeps the header visible while scrolling. Requires the app header height as top offset. */
  stickyHeader?: boolean;
  /**
   * Keeps the footer rows visible whilst the body scrolls.
   *
   * For a footer that sums the column above it: a total that scrolls out of
   * sight stops answering the question it was put there to answer.
   */
  stickyFooter?: boolean;
  /** Optional default sort applied on first render. */
  initialSort?: SortState | null;
  /**
   * Rows under the body, each keyed by column id.
   *
   * @remarks
   * Rendered inside the table so a summed column lines up with the values it
   * sums. A total written under the table instead only lines up by accident,
   * and stops doing so as soon as a column width changes.
   */
  footerRows?: Array<{ id: string; cells: Record<string, ReactNode> }>;
  /**
   * A note filling the left of the footer, beside the rows rather than under
   * them.
   *
   * @remarks
   * Spans `columnCount` columns and every footer row, so an explanation of the
   * amounts sits inside the same block as the amounts. `columnCount` counts
   * from the left, and those columns then carry no cell of their own in any
   * footer row.
   */
  footerLead?: { node: ReactNode; columnCount: number };
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
  groups,
  getRowKey,
  getRowClassName,
  getRowProps,
  stickyHeader = false,
  stickyFooter = false,
  footerRows,
  footerLead,
  initialSort = null,
  sort: controlledSort,
  onSortChange,
  allowUnsorted = true,
}: DataTableProps<T>) {
  const [uncontrolledSort, setUncontrolledSort] = useReducer(updateSortState, initialSort);
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

  const sortRows = useCallback(
    (rows: T[]): T[] => {
      if (!sort) return rows;
      const col = columns.find((c) => c.id === sort.id);
      if (!col?.sortKey) return rows;
      return Array.from(rows).sort((a, b) => {
        // biome-ignore lint/style/noNonNullAssertion: col is confirmed to have sortKey above
        const av = col.sortKey!(a);
        // biome-ignore lint/style/noNonNullAssertion: col is confirmed to have sortKey above
        const bv = col.sortKey!(b);
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : tableSortCollator.compare(String(av), String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    },
    [columns, sort],
  );

  const sorted = useMemo(() => sortRows(data ?? EMPTY_TABLE_ROWS), [data, sortRows]);

  const sortedGroups = useMemo(
    () => groups?.map((g) => ({ ...g, rows: sortRows(g.rows) })),
    [groups, sortRows],
  );

  return (
    <Table>
      <TableHead
        className={stickyHeader ? "sticky -top-3 z-10 shadow-[0_1px_0_var(--ds-border)]" : ""}
      >
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => {
            const sortDirection: TableSortDirection = sort?.id === col.id ? sort.dir : null;

            return (
              <Th
                key={col.id}
                aria-sort={col.sortKey ? getTableSortAriaSort(sortDirection) : undefined}
                // A column title stays on one line. Broken over two, it
                // changes the height of the whole header row and stops reading
                // as a label for what is under it.
                className={`whitespace-nowrap ${col.headerClassName ?? col.className ?? ""} ${col.sortKey ? "select-none" : ""}`}
              >
                {col.sortKey ? (
                  <TableSortHeader
                    direction={sortDirection}
                    label={col.header}
                    onClick={() => handleSort(col)}
                  />
                ) : (
                  col.header
                )}
              </Th>
            );
          })}
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedGroups
          ? (() => {
              let stripeIndex = 0;
              return sortedGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <tr className="bg-[var(--ds-surface-inset)] hover:bg-transparent">
                    <td
                      colSpan={columns.length}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]"
                    >
                      {group.header}
                    </td>
                  </tr>
                  {group.rows.map((row) => {
                    const idx = stripeIndex++;
                    const rowProps = getRowProps?.(row) ?? {};
                    const { className: rowClassName, ...restRowProps } = rowProps;

                    return (
                      <TableRow
                        key={getRowKey(row)}
                        {...restRowProps}
                        className={`${idx % 2 === 1 ? "bg-[var(--ds-row-stripe)]" : ""} ${getRowClassName?.(row) ?? ""} ${rowClassName ?? ""}`}
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
          : sorted.map((row, index) => {
              const rowProps = getRowProps?.(row) ?? {};
              const { className: rowClassName, ...restRowProps } = rowProps;

              return (
                <TableRow
                  key={getRowKey(row)}
                  {...restRowProps}
                  className={`${index % 2 === 1 ? "bg-[var(--ds-row-stripe)]" : ""} ${getRowClassName?.(row) ?? ""} ${rowClassName ?? ""}`}
                >
                  {columns.map((col) => (
                    <Td key={col.id} className={col.cellClassName ?? col.className ?? ""}>
                      {col.cell(row)}
                    </Td>
                  ))}
                </TableRow>
              );
            })}
      </TableBody>
      {footerRows && footerRows.length > 0 ? (
        <tfoot
          className={`border-t border-[var(--ds-border)] bg-[var(--ds-surface)] ${
            // Pulled past the scroll container's own padding, the way the
            // sticky header is. At `bottom-0` it stops at the padding's inner
            // edge and the rows go on showing through the 12 pixels below it.
            // The line is drawn as a shadow rather than a border, so it sits
            // above the rows sliding under it rather than inside the footer.
            stickyFooter ? "sticky -bottom-3 z-10 shadow-[0_-1px_0_var(--ds-border)]" : ""
          }`}
        >
          {footerRows.map((row, rowIndex) => (
            <tr key={row.id}>
              {/* Once, in the first row, spanning the rest. The columns it
                  covers are then skipped in every row, which is what keeps the
                  remaining cells under the values they belong to. */}
              {footerLead && rowIndex === 0 ? (
                <Td colSpan={footerLead.columnCount} rowSpan={footerRows.length} className="w-1/3">
                  {footerLead.node}
                </Td>
              ) : null}
              {columns.slice(footerLead?.columnCount ?? 0).map((col) => (
                <Td key={col.id} className={col.cellClassName ?? col.className ?? ""}>
                  {row.cells[col.id] ?? null}
                </Td>
              ))}
            </tr>
          ))}
        </tfoot>
      ) : null}
    </Table>
  );
}
