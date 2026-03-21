import { CaretDownIcon, CaretUpIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Primitives ───────────────────────────────────────────────────────────────

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

const RESIZE_MIN_WIDTH = 96;

function getColumnWidthStorageKey(columnIds: string[]): string | null {
  if (typeof window === "undefined") return null;
  if (columnIds.length === 0) return null;
  return `datatable:widths:${window.location.pathname}:${columnIds.join("|")}`;
}

function loadColumnWidths(storageKey: string | null): Record<string, number> {
  if (!storageKey || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) =>
        typeof value === "number" && Number.isFinite(value) ? [[key, value]] : [],
      ),
    );
  } catch {
    return {};
  }
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
  const columnIds = useMemo(() => columns.map((col) => col.id), [columns]);
  const columnStorageKey = getColumnWidthStorageKey(columnIds);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    loadColumnWidths(columnStorageKey),
  );
  const [uncontrolledSort, setUncontrolledSort] = useState<SortState | null>(initialSort);
  const sort = controlledSort ?? uncontrolledSort;
  const mouseMoveHandlerRef = useRef<(event: MouseEvent) => void>(() => {});
  const resizeStateRef = useRef<{
    leftColId: string;
    rightColId: string;
    startX: number;
    startLeftWidth: number;
    startRightWidth: number;
  } | null>(null);

  useEffect(() => {
    setColumnWidths(loadColumnWidths(columnStorageKey));
  }, [columnStorageKey]);

  useEffect(() => {
    if (controlledSort !== undefined) return;
    setUncontrolledSort(initialSort);
  }, [controlledSort, initialSort]);

  useEffect(() => {
    if (!columnStorageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(columnStorageKey, JSON.stringify(columnWidths));
    } catch {}
  }, [columnStorageKey, columnWidths]);

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

  const stopResize = useCallback(() => {
    resizeStateRef.current = null;
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    window.removeEventListener("mousemove", mouseMoveHandlerRef.current);
    window.removeEventListener("mouseup", stopResize);
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    const state = resizeStateRef.current;
    if (!state) return;
    const delta = event.clientX - state.startX;
    const combinedWidth = state.startLeftWidth + state.startRightWidth;
    const minLeft = RESIZE_MIN_WIDTH;
    const maxLeft = combinedWidth - RESIZE_MIN_WIDTH;
    const rawNextLeftWidth = state.startLeftWidth + delta;
    const nextLeftWidth = Math.min(maxLeft, Math.max(minLeft, rawNextLeftWidth));
    const nextRightWidth = combinedWidth - nextLeftWidth;
    setColumnWidths((current) => ({
      ...current,
      [state.leftColId]: nextLeftWidth,
      [state.rightColId]: nextRightWidth,
    }));
    if (rawNextLeftWidth <= minLeft || rawNextLeftWidth >= maxLeft) {
      stopResize();
    }
  }, [stopResize]);

  useEffect(() => {
    mouseMoveHandlerRef.current = onMouseMove;
  }, [onMouseMove]);

  const startResize = useCallback((event: React.MouseEvent, leftColIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    const header = (event.currentTarget as HTMLElement).closest("th");
    if (!header) return;
    const leftCol = columns[leftColIndex];
    const rightCol = columns[leftColIndex + 1];
    if (!leftCol || !rightCol) return;
    const headerRow = header.parentElement;
    let nextLeftWidth = header.getBoundingClientRect().width;
    let nextRightWidth = nextLeftWidth;
    if (headerRow) {
      const headerCells = Array.from(headerRow.querySelectorAll("th"));
      const frozenWidths = Object.fromEntries(
        columns
          .map((col, index) => {
            const cell = headerCells[index];
            const width = cell?.getBoundingClientRect().width;
            return typeof width === "number" && Number.isFinite(width) ? [col.id, width] : null;
          })
          .filter((entry): entry is [string, number] => entry !== null),
      );
      const measuredLeft = frozenWidths[leftCol.id];
      const measuredRight = frozenWidths[rightCol.id];
      if (typeof measuredLeft === "number") nextLeftWidth = measuredLeft;
      if (typeof measuredRight === "number") nextRightWidth = measuredRight;
      if (Object.keys(frozenWidths).length > 0) {
        setColumnWidths((current) => ({ ...current, ...frozenWidths }));
      }
    }
    resizeStateRef.current = {
      leftColId: leftCol.id,
      rightColId: rightCol.id,
      startX: event.clientX,
      startLeftWidth: nextLeftWidth,
      startRightWidth: nextRightWidth,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", mouseMoveHandlerRef.current);
    window.addEventListener("mouseup", stopResize);
  }, [columns, stopResize]);

  useEffect(
    () => () => {
      stopResize();
    },
    [stopResize],
  );

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
        className={stickyHeader ? "sticky top-14 z-10 shadow-[0_1px_0_var(--ds-border)]" : ""}
      >
        <TableRow className="hover:bg-transparent">
          {columns.map((col, index) => (
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
              style={
                columnWidths[col.id]
                  ? { width: columnWidths[col.id], minWidth: columnWidths[col.id] }
                  : undefined
              }
            >
              <div className="relative -mx-1 px-1">
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
                {index < columns.length - 1 && (
                  <>
                    <div
                      role="presentation"
                      onMouseDown={(event) => startResize(event, index)}
                      className="absolute top-0 right-[-6px] h-full w-3 cursor-col-resize z-20"
                      aria-hidden
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 h-4 w-px bg-[var(--ds-border-strong)] opacity-100 pointer-events-none" />
                  </>
                )}
              </div>
            </Th>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={getRowKey(row)} className={getRowClassName?.(row)}>
            {columns.map((col) => (
              <Td
                key={col.id}
                className={col.cellClassName ?? col.className ?? ""}
                style={
                  columnWidths[col.id]
                    ? { width: columnWidths[col.id], minWidth: columnWidths[col.id] }
                    : undefined
                }
              >
                {col.cell(row)}
              </Td>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
