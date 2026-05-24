import Link from "next/link";
import styles from "../brands/page.module.css";

type AdminPaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
  total: number;
  totalPages: number;
};

function buildPageHref(basePath: string, params: Record<string, string | undefined>, page: number, pageSize: number) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  return `${basePath}?${searchParams.toString()}`;
}

export default function AdminPagination({
  basePath,
  page,
  pageSize,
  params = {},
  total,
  totalPages,
}: AdminPaginationProps) {
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      {page > 1 ? (
        <Link className={styles.secondaryLinkButton} href={buildPageHref(basePath, params, previousPage, pageSize)}>
          Previous
        </Link>
      ) : (
        <span className={styles.disabledPagination}>Previous</span>
      )}
      <span className={styles.pageSummary}>
        Page {page} of {totalPages} - {total} total
      </span>
      {page < totalPages ? (
        <Link className={styles.secondaryLinkButton} href={buildPageHref(basePath, params, nextPage, pageSize)}>
          Next
        </Link>
      ) : (
        <span className={styles.disabledPagination}>Next</span>
      )}
    </nav>
  );
}
