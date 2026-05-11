import type { SortState } from "@/components/ui/Table.tsx";

const TABLE_SORT_STORAGE_VERSION = 1;

interface StoredTableSort {
  sort: SortState | null;
  version: typeof TABLE_SORT_STORAGE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSortState(
  value: unknown,
  sortableColumns: ReadonlySet<string>,
): SortState | null {
  if (!isRecord(value)) return null;
  const { id, dir } = value;
  if (typeof id !== "string" || !sortableColumns.has(id)) return null;
  if (dir !== "asc" && dir !== "desc") return null;
  return { id, dir };
}

/**
 * Parses a validated table sort from URL query parameters.
 *
 * @param searchParams - Current route search parameters.
 * @param sortableColumns - Allowed column ids for the table.
 * @returns Valid sort state or null when the query is incomplete or invalid.
 */
export function parseTableSortFromSearchParams(
  searchParams: URLSearchParams,
  sortableColumns: ReadonlySet<string>,
): SortState | null {
  return normalizeSortState(
    {
      id: searchParams.get("sort"),
      dir: searchParams.get("dir"),
    },
    sortableColumns,
  );
}

/**
 * Reads a persisted table sort preference.
 *
 * Hidden behavior: returns undefined when no valid stored preference exists,
 * and null when the user explicitly persisted an unsorted table.
 *
 * @param storageKey - localStorage key.
 * @param sortableColumns - Allowed column ids for the table.
 * @returns Stored sort, null for unsorted, or undefined when absent/invalid.
 */
export function readStoredTableSort(
  storageKey: string,
  sortableColumns: ReadonlySet<string>,
): SortState | null | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== TABLE_SORT_STORAGE_VERSION) {
      window.localStorage.removeItem(storageKey);
      return undefined;
    }

    if (parsed.sort === null) return null;

    const sort = normalizeSortState(parsed.sort, sortableColumns);
    if (!sort) {
      window.localStorage.removeItem(storageKey);
      return undefined;
    }

    return sort;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
    return undefined;
  }
}

/**
 * Persists a table sort preference.
 *
 * @param storageKey - localStorage key.
 * @param sort - Sort state, or null for an explicitly unsorted table.
 * @param sortableColumns - Allowed column ids for the table.
 */
export function writeStoredTableSort(
  storageKey: string,
  sort: SortState | null,
  sortableColumns: ReadonlySet<string>,
) {
  if (typeof window === "undefined") return;

  try {
    const normalizedSort = sort
      ? normalizeSortState(sort, sortableColumns)
      : null;
    if (sort && !normalizedSort) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const stored: StoredTableSort = {
      version: TABLE_SORT_STORAGE_VERSION,
      sort: normalizedSort,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {}
}
