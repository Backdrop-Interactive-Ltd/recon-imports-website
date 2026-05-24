import Link from "next/link";
import AdminPagination from "../_components/AdminPagination";
import { createPaginatedResult, getPaginationState, getStringParam } from "../_components/listParams";
import { prisma } from "../../../../lib/prisma";
import type { Prisma } from "../../../../lib/generated/prisma/client";
import styles from "../brands/page.module.css";
import NewsletterSubscriberRowActions from "./NewsletterSubscriberRowActions";

export const metadata = {
  title: "Newsletter | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

type NewsletterFilters = {
  isActive?: string;
  page?: string;
  pageSize?: string;
  q?: string;
  sort?: string;
};

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function getNewsletterWhere(filters: NewsletterFilters) {
  const where: Prisma.NewsletterSubscriberWhereInput = {};
  const query = filters.q?.trim();

  if (filters.isActive === "true") {
    where.isActive = true;
  }

  if (filters.isActive === "false") {
    where.isActive = false;
  }

  if (query) {
    where.email = { contains: query };
  }

  return where;
}

async function getNewsletterSubscribers(filters: NewsletterFilters) {
  const pagination = getPaginationState(filters);
  const where = getNewsletterWhere(filters);
  const [total, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({
      orderBy: [{ createdAt: filters.sort === "oldest" ? "asc" : "desc" }],
      skip: pagination.skip,
      take: pagination.take,
      where,
      select: {
        createdAt: true,
        email: true,
        id: true,
        isActive: true,
        updatedAt: true,
      },
    }),
  ]);

  return createPaginatedResult(
    subscribers.map((subscriber) => ({
      ...subscriber,
      createdAtLabel: dateFormatter.format(subscriber.createdAt),
      updatedAtLabel: dateFormatter.format(subscriber.updatedAt),
    })),
    total,
    pagination,
  );
}

async function getNewsletterStats() {
  const [total, activeSubscribers] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
  ]);

  return {
    activeSubscribers,
    inactiveSubscribers: total - activeSubscribers,
    total,
  };
}

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: NewsletterFilters = {
    isActive: getStringParam(params.isActive),
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
    q: getStringParam(params.q),
    sort: getStringParam(params.sort),
  };
  const [subscribersPage, stats] = await Promise.all([getNewsletterSubscribers(filters), getNewsletterStats()]);
  const subscribers = subscribersPage.items;
  const pageParams = {
    isActive: filters.isActive,
    q: filters.q,
    sort: filters.sort,
  };

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Audience</p>
          <h1>Newsletter Subscribers</h1>
          <span>Review newsletter emails, subscription status, and subscriber activity.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Subscribers</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{stats.activeSubscribers}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{stats.inactiveSubscribers}</strong>
        </div>
      </div>

      <section className={styles.listPanel}>
        <form className={styles.filterBar} method="get">
          <label>
            <span>Search</span>
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Email address" />
          </label>
          <label>
            <span>Status</span>
            <select name="isActive" defaultValue={filters.isActive ?? ""}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select name="sort" defaultValue={filters.sort ?? ""}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
          <label>
            <span>Page size</span>
            <select name="pageSize" defaultValue={filters.pageSize || "20"}>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Apply
          </button>
          <Link className={styles.secondaryLinkButton} href="/admin/newsletter">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Subscriber List</p>
            <h2>Database newsletter subscribers</h2>
          </div>
          <span>{subscribers.length} shown of {subscribersPage.total}</span>
        </div>

        {subscribers.length > 0 ? (
          <div className={styles.brandList}>
            {subscribers.map((subscriber) => (
              <article className={styles.brandCard} key={subscriber.id}>
                <div className={styles.brandTopline}>
                  <div className={styles.brandIdentity}>
                    <span className={styles.logoBox}>{getInitials(subscriber.email)}</span>
                    <div>
                      <h3>{subscriber.email}</h3>
                      <p>Subscribed {subscriber.createdAtLabel}</p>
                    </div>
                  </div>
                  <span className={subscriber.isActive ? styles.activeBadge : styles.inactiveBadge}>
                    {subscriber.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <dl className={styles.brandMeta}>
                  <div>
                    <dt>Status</dt>
                    <dd>{subscriber.isActive ? "Active" : "Inactive"}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{subscriber.createdAtLabel}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{subscriber.updatedAtLabel}</dd>
                  </div>
                </dl>

                <NewsletterSubscriberRowActions
                  email={subscriber.email}
                  isActive={subscriber.isActive}
                  subscriberId={subscriber.id}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No newsletter subscribers found</strong>
            <p>Adjust the filters or wait for new footer newsletter submissions.</p>
          </div>
        )}
        <AdminPagination
          basePath="/admin/newsletter"
          page={subscribersPage.page}
          pageSize={subscribersPage.pageSize}
          params={pageParams}
          total={subscribersPage.total}
          totalPages={subscribersPage.totalPages}
        />
      </section>
    </section>
  );
}
