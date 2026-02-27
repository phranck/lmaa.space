/**
 * Canonical success envelope returned by API handlers.
 */
export interface ApiSuccess<T> {
  data: T;
  error?: never;
}

/**
 * Canonical error envelope returned by API handlers.
 */
export interface ApiError {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Union of supported API response envelopes.
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Generic pagination payload used by list endpoints.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Aggregated search result used by site-wide search.
 */
export interface SearchResult {
  shops: import("./shop.js").Shop[];
  categories: import("./category.js").Category[];
  query: string;
  total: number;
}
