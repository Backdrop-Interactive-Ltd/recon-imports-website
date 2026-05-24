export type PaginationInput = {
  page?: string;
  pageSize?: string;
};

export type PaginationState = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const defaultPageSize = 20;
const maxPageSize = 100;

export function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function getPaginationState(input: PaginationInput = {}): PaginationState {
  const pageValue = Number.parseInt(input.page ?? "", 10);
  const pageSizeValue = Number.parseInt(input.pageSize ?? "", 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize =
    Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? Math.min(pageSizeValue, maxPageSize) : defaultPageSize;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function createPaginatedResult<T>(items: T[], total: number, pagination: PaginationState): PaginatedResult<T> {
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
