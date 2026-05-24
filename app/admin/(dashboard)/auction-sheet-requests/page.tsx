import Link from "next/link";
import AdminPagination from "../_components/AdminPagination";
import { createPaginatedResult, getPaginationState, getStringParam } from "../_components/listParams";
import { AuctionSheetStatus, PaymentStatus } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import type { Prisma } from "../../../../lib/generated/prisma/client";
import styles from "../brands/page.module.css";
import AuctionSheetRequestRowActions from "./AuctionSheetRequestRowActions";
import { auctionSheetStatusOptions, formatEnumLabel, paymentStatusOptions } from "./formOptions";

export const metadata = {
  title: "Auction Sheet Requests | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const paymentMethodOptions = ["bKash", "Nagad", "Rocket", "Bank Transfer"] as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-IN");

type AuctionSheetFilters = {
  page?: string;
  pageSize?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  q?: string;
  sort?: string;
  status?: string;
};

function getAuctionSheetWhere(filters: AuctionSheetFilters) {
  const where: Prisma.AuctionSheetRequestWhereInput = {};
  const query = filters.q?.trim();

  if (filters.status && Object.values(AuctionSheetStatus).includes(filters.status as AuctionSheetStatus)) {
    where.status = filters.status as AuctionSheetStatus;
  }

  if (filters.paymentStatus && Object.values(PaymentStatus).includes(filters.paymentStatus as PaymentStatus)) {
    where.paymentStatus = filters.paymentStatus as PaymentStatus;
  }

  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }

  if (query) {
    where.OR = [
      { chassisNumber: { contains: query } },
      { name: { contains: query } },
      { phone: { contains: query } },
      { email: { contains: query } },
      { transactionId: { contains: query } },
    ];
  }

  return where;
}

async function getAuctionSheetRequests(filters: AuctionSheetFilters) {
  const pagination = getPaginationState(filters);
  const where = getAuctionSheetWhere(filters);
  const [total, requests] = await Promise.all([
    prisma.auctionSheetRequest.count({ where }),
    prisma.auctionSheetRequest.findMany({
      orderBy: { createdAt: filters.sort === "oldest" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.take,
      where,
      select: {
        chassisNumber: true,
        createdAt: true,
        email: true,
        feeAmount: true,
        id: true,
        name: true,
        paymentMethod: true,
        paymentStatus: true,
        phone: true,
        reportUrl: true,
        senderNumber: true,
        status: true,
        transactionId: true,
        updatedAt: true,
      },
    }),
  ]);

  return createPaginatedResult(
    requests.map((request) => ({
      ...request,
      createdAtLabel: dateFormatter.format(request.createdAt),
      feeAmountLabel: `BDT ${numberFormatter.format(request.feeAmount)}`,
      paymentStatusLabel: formatEnumLabel(request.paymentStatus),
      statusLabel: formatEnumLabel(request.status),
      updatedAtLabel: dateFormatter.format(request.updatedAt),
    })),
    total,
    pagination,
  );
}

async function getAuctionSheetStats() {
  const [total, pendingPayments, processingRequests, completedRequests] = await Promise.all([
    prisma.auctionSheetRequest.count(),
    prisma.auctionSheetRequest.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
    prisma.auctionSheetRequest.count({ where: { status: AuctionSheetStatus.PROCESSING } }),
    prisma.auctionSheetRequest.count({ where: { status: AuctionSheetStatus.COMPLETED } }),
  ]);

  return { completedRequests, pendingPayments, processingRequests, total };
}

export default async function AdminAuctionSheetRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: AuctionSheetFilters = {
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
    paymentMethod: getStringParam(params.paymentMethod),
    paymentStatus: getStringParam(params.paymentStatus),
    q: getStringParam(params.q),
    sort: getStringParam(params.sort),
    status: getStringParam(params.status),
  };
  const [requestsPage, stats] = await Promise.all([getAuctionSheetRequests(filters), getAuctionSheetStats()]);
  const requests = requestsPage.items;
  const pageParams = {
    paymentMethod: filters.paymentMethod,
    paymentStatus: filters.paymentStatus,
    q: filters.q,
    sort: filters.sort,
    status: filters.status,
  };

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Verification</p>
          <h1>Auction Sheet Requests</h1>
          <span>Track auction sheet verification requests, payment status, processing status, and report URLs.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Requests</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Pending Payment</span>
          <strong>{stats.pendingPayments}</strong>
        </div>
        <div>
          <span>Processing</span>
          <strong>{stats.processingRequests}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{stats.completedRequests}</strong>
        </div>
      </div>

      <section className={styles.listPanel}>
        <form className={styles.filterBar} method="get">
          <label>
            <span>Search</span>
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Chassis, name, phone, email, transaction" />
          </label>
          <label>
            <span>Status</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              {auctionSheetStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Payment</span>
            <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}>
              <option value="">All</option>
              {paymentStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnumLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Method</span>
            <select name="paymentMethod" defaultValue={filters.paymentMethod ?? ""}>
              <option value="">All</option>
              {paymentMethodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
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
          <Link className={styles.secondaryLinkButton} href="/admin/auction-sheet-requests">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Request Inbox</p>
            <h2>Database auction sheet requests</h2>
          </div>
          <span>{requests.length} shown of {requestsPage.total}</span>
        </div>

        {requests.length > 0 ? (
          <div className={styles.brandList}>
            {requests.map((request) => (
              <article className={styles.brandCard} key={request.id}>
                <div className={styles.brandTopline}>
                  <div className={styles.brandIdentity}>
                    <span className={styles.logoBox}>{request.chassisNumber.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <h3>{request.chassisNumber}</h3>
                      <p>
                        {request.name} - {request.phone}
                      </p>
                    </div>
                  </div>
                  <span className={request.status === AuctionSheetStatus.COMPLETED ? styles.inactiveBadge : styles.activeBadge}>
                    {request.statusLabel}
                  </span>
                </div>

                <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                  <div>
                    <dt>Payment</dt>
                    <dd>{request.paymentStatusLabel}</dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{request.paymentMethod || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Sender</dt>
                    <dd>{request.senderNumber || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Transaction</dt>
                    <dd>{request.transactionId || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Fee</dt>
                    <dd>{request.feeAmountLabel}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{request.email}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{request.createdAtLabel}</dd>
                  </div>
                </dl>

                <details className={styles.editDetails}>
                  <summary>View request details</summary>
                  <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                    <div>
                      <dt>Name</dt>
                      <dd>{request.name}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        <a href={`tel:${request.phone}`}>{request.phone}</a>
                      </dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <a href={`mailto:${request.email}`}>{request.email}</a>
                      </dd>
                    </div>
                    <div>
                      <dt>Payment Method</dt>
                      <dd>{request.paymentMethod || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Sender Number</dt>
                      <dd>{request.senderNumber || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Transaction ID</dt>
                      <dd>{request.transactionId || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{request.updatedAtLabel}</dd>
                    </div>
                    <div>
                      <dt>Report URL</dt>
                      <dd>
                        {request.reportUrl ? (
                          <a href={request.reportUrl} target="_blank" rel="noreferrer">
                            Open report
                          </a>
                        ) : (
                          "Not set"
                        )}
                      </dd>
                    </div>
                  </dl>
                </details>

                <AuctionSheetRequestRowActions
                  paymentStatus={request.paymentStatus}
                  reportUrl={request.reportUrl}
                  requestId={request.id}
                  requestLabel={request.chassisNumber}
                  status={request.status}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No auction sheet requests found</strong>
            <p>Adjust the filters or wait for new Verify Auction Sheet submissions.</p>
          </div>
        )}
        <AdminPagination
          basePath="/admin/auction-sheet-requests"
          page={requestsPage.page}
          pageSize={requestsPage.pageSize}
          params={pageParams}
          total={requestsPage.total}
          totalPages={requestsPage.totalPages}
        />
      </section>
    </section>
  );
}
