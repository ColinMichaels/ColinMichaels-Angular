export const DEFAULT_PAGINATION_PAGE_SIZE = 10;

export type PaginationItem = number | 'ellipsis';

/** Treat missing, fractional, negative, and otherwise invalid URL state as page one. */
export function parsePaginationPage(value: string | null | undefined): number {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPaginationPageCount(
  totalItems: number,
  pageSize: number = DEFAULT_PAGINATION_PAGE_SIZE
): number {
  const safePageSize = Math.max(1, Math.floor(pageSize));

  return Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize));
}

export function clampPaginationPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, Math.floor(page)), Math.max(1, Math.floor(totalPages)));
}

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number = DEFAULT_PAGINATION_PAGE_SIZE
): readonly T[] {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const safePage = clampPaginationPage(page, getPaginationPageCount(items.length, safePageSize));
  const firstItemIndex = (safePage - 1) * safePageSize;

  return items.slice(firstItemIndex, firstItemIndex + safePageSize);
}

/** Keep both endpoints visible while bounding long archives to the active page and its immediate neighbors. */
export function createPaginationItems(currentPage: number, totalPages: number): readonly PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({length: totalPages}, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages]);

  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
    pages.add(page);
  }

  const items: PaginationItem[] = [];
  let previousPage = 0;

  for (const page of [...pages].sort((left, right) => left - right)) {
    if (previousPage > 0 && page - previousPage > 1) {
      items.push('ellipsis');
    }

    items.push(page);
    previousPage = page;
  }

  return items;
}
