export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * One server page and the count of every row that matched the same filter.
 */
export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/**
 * Applies the default page size and keeps the requested page inside the allowed bounds.
 */
export function normalizePage(limit?: number, offset?: number): { readonly limit: number; readonly offset: number } {
  const requested = limit ?? DEFAULT_PAGE_LIMIT;
  return {
    limit: Math.min(Math.max(requested, 1), MAX_PAGE_LIMIT),
    offset: Math.max(offset ?? 0, 0),
  };
}
