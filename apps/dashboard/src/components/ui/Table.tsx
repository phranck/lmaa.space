import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

// ─── Primitives ───────────────────────────────────────────────────────────────
// Use these when you need full manual control over the table structure.

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full rounded-card border border-gray-200 overflow-hidden">
      <table className={`w-full border-collapse text-sm ${className}`} {...props} />
    </div>
  );
}

export function TableHead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-gray-200 text-left ${className}`} {...props} />;
}

export function TableBody({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-gray-100 bg-white ${className}`} {...props} />;
}

export function TableRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-gray-50 transition-colors ${className}`} {...props} />;
}

export function Th({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 ${className}`}
      {...props}
    />
  );
}

export function Td({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-2 ${className}`} {...props} />;
}

// ─── Column-based DataTable ───────────────────────────────────────────────────
// Pass a columns definition array and data – the table renders itself.

export interface ColumnDef<T> {
  /** Unique key for this column */
  id: string;
  /** Header label – omit or pass "" for columns without a header (e.g. image, actions) */
  header?: ReactNode;
  /** Renders the cell content for a given row */
  cell: (row: T) => ReactNode;
  /** className applied to both <th> and <td> */
  className?: string;
  /** className applied to <th> only (overrides className for the header) */
  headerClassName?: string;
  /** className applied to <td> only (overrides className for data cells) */
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Returns a stable key for each row */
  getRowKey: (row: T) => string | number;
  /** Optional extra className per row (e.g. for conditional highlighting) */
  getRowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  getRowClassName,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHead>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <Th
              key={col.id}
              className={col.headerClassName ?? col.className ?? ""}
            >
              {col.header}
            </Th>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row) => (
          <TableRow key={getRowKey(row)} className={getRowClassName?.(row)}>
            {columns.map((col) => (
              <Td
                key={col.id}
                className={col.cellClassName ?? col.className ?? ""}
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
