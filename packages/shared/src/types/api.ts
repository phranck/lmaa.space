export interface ApiSuccess<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchResult {
  shops: import("./shop.js").Shop[];
  categories: import("./category.js").Category[];
  query: string;
  total: number;
}
