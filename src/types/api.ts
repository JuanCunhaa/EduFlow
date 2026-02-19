/**
 * API response and request types — formalizes the HTTP contract.
 * Used by both API routes (server) and SWR hooks (client).
 */

/** Standard success response wrapper */
export interface ApiResponse<T = unknown> {
  data: T;
}

/** Standard error response */
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/** Paginated response with cursor-based pagination */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}
