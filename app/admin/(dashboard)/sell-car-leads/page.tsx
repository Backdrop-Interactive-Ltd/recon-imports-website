import Link from "next/link";
import AdminPagination from "../_components/AdminPagination";
import { createPaginatedResult, getPaginationState, getStringParam } from "../_components/listParams";
import { LeadStatus } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import type { Prisma } from "../../../../lib/generated/prisma/client";
import styles from "../brands/page.module.css";
import SellCarLeadRowActions from "./SellCarLeadRowActions";
import { formatLeadStatus, sellCarLeadStatusOptions } from "./formOptions";

export const metadata = {
  title: "Sell Car Leads | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

type SellCarLeadFilters = {
  page?: string;
  pageSize?: string;
  q?: string;
  sort?: string;
  status?: string;
};

function getSellCarLeadWhere(filters: SellCarLeadFilters) {
  const where: Prisma.SellCarLeadWhereInput = {};
  const query = filters.q?.trim();

  if (filters.status && Object.values(LeadStatus).includes(filters.status as LeadStatus)) {
    where.status = filters.status as LeadStatus;
  }

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { phone: { contains: query } },
      { carName: { contains: query } },
      { model: { contains: query } },
    ];
  }

  return where;
}

async function getSellCarLeads(filters: SellCarLeadFilters) {
  const pagination = getPaginationState(filters);
  const where = getSellCarLeadWhere(filters);
  const [total, leads] = await Promise.all([
    prisma.sellCarLead.count({ where }),
    prisma.sellCarLead.findMany({
      orderBy: { createdAt: filters.sort === "oldest" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.take,
      where,
      select: {
        carName: true,
        createdAt: true,
        id: true,
        imageUrls: true,
        mileage: true,
        model: true,
        name: true,
        offeredPrice: true,
        phone: true,
        registrationYear: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  return createPaginatedResult(
    leads.map((lead) => ({
      ...lead,
      createdAtLabel: dateFormatter.format(lead.createdAt),
      statusLabel: formatLeadStatus(lead.status),
      updatedAtLabel: dateFormatter.format(lead.updatedAt),
    })),
    total,
    pagination,
  );
}

async function getSellCarLeadStats() {
  const [total, newLeads, reviewedLeads, closedLeads] = await Promise.all([
    prisma.sellCarLead.count(),
    prisma.sellCarLead.count({ where: { status: LeadStatus.NEW } }),
    prisma.sellCarLead.count({ where: { status: LeadStatus.REVIEWED } }),
    prisma.sellCarLead.count({ where: { status: LeadStatus.CLOSED } }),
  ]);

  return { closedLeads, newLeads, reviewedLeads, total };
}

export default async function AdminSellCarLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: SellCarLeadFilters = {
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
    q: getStringParam(params.q),
    sort: getStringParam(params.sort),
    status: getStringParam(params.status),
  };
  const [leadsPage, stats] = await Promise.all([getSellCarLeads(filters), getSellCarLeadStats()]);
  const leads = leadsPage.items;
  const pageParams = {
    q: filters.q,
    sort: filters.sort,
    status: filters.status,
  };

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Leads</p>
          <h1>Sell Your Car Leads</h1>
          <span>Review car seller submissions, vehicle details, uploaded images, and lead status.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Leads</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>New</span>
          <strong>{stats.newLeads}</strong>
        </div>
        <div>
          <span>Reviewed</span>
          <strong>{stats.reviewedLeads}</strong>
        </div>
        <div>
          <span>Closed</span>
          <strong>{stats.closedLeads}</strong>
        </div>
      </div>

      <section className={styles.listPanel}>
        <form className={styles.filterBar} method="get">
          <label>
            <span>Search</span>
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Name, phone, car, model" />
          </label>
          <label>
            <span>Status</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              {sellCarLeadStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLeadStatus(option)}
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
          <Link className={styles.secondaryLinkButton} href="/admin/sell-car-leads">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Lead Inbox</p>
            <h2>Database sell car leads</h2>
          </div>
          <span>{leads.length} shown of {leadsPage.total}</span>
        </div>

        {leads.length > 0 ? (
          <div className={styles.brandList}>
            {leads.map((lead) => (
              <article className={styles.brandCard} key={lead.id}>
                <div className={styles.brandTopline}>
                  <div className={styles.brandIdentity}>
                    <span className={styles.logoBox}>
                      {lead.imageUrls[0] ? <img alt={`${lead.carName} uploaded`} src={lead.imageUrls[0]} /> : lead.carName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{lead.carName}</h3>
                      <p>
                        {lead.name} - {lead.phone}
                      </p>
                    </div>
                  </div>
                  <span className={lead.status === LeadStatus.CLOSED ? styles.inactiveBadge : styles.activeBadge}>
                    {lead.statusLabel}
                  </span>
                </div>

                <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                  <div>
                    <dt>Model</dt>
                    <dd>{lead.model || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Reg. Year</dt>
                    <dd>{lead.registrationYear || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Mileage</dt>
                    <dd>{lead.mileage || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Offered Price</dt>
                    <dd>{lead.offeredPrice || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Images</dt>
                    <dd>{lead.imageUrls.length}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{lead.createdAtLabel}</dd>
                  </div>
                </dl>

                <details className={styles.editDetails}>
                  <summary>View lead details</summary>
                  <dl className={`${styles.brandMeta} ${styles.carMeta}`}>
                    <div>
                      <dt>Name</dt>
                      <dd>{lead.name}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{lead.statusLabel}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{lead.updatedAtLabel}</dd>
                    </div>
                  </dl>

                  {lead.imageUrls.length > 0 ? (
                    <div className={styles.imageGrid}>
                      {lead.imageUrls.map((imageUrl) => (
                        <a href={imageUrl} key={imageUrl} target="_blank" rel="noreferrer">
                          <img alt={`${lead.carName} uploaded detail`} src={imageUrl} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.mutedText}>No images uploaded.</p>
                  )}
                </details>

                <SellCarLeadRowActions leadId={lead.id} leadName={lead.carName} status={lead.status} />
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No sell car leads found</strong>
            <p>Adjust the filters or wait for new Sell Your Car submissions.</p>
          </div>
        )}
        <AdminPagination
          basePath="/admin/sell-car-leads"
          page={leadsPage.page}
          pageSize={leadsPage.pageSize}
          params={pageParams}
          total={leadsPage.total}
          totalPages={leadsPage.totalPages}
        />
      </section>
    </section>
  );
}
