import Link from "next/link";
import AdminPagination from "../_components/AdminPagination";
import { createPaginatedResult, getPaginationState, getStringParam } from "../_components/listParams";
import { LeadStatus } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import type { Prisma } from "../../../../lib/generated/prisma/client";
import styles from "../brands/page.module.css";
import RequirementLeadRowActions from "./RequirementLeadRowActions";
import { formatLeadStatus, requirementLeadStatusOptions } from "./formOptions";

export const metadata = {
  title: "Requirement Leads | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

type RequirementLeadFilters = {
  page?: string;
  pageSize?: string;
  q?: string;
  sort?: string;
  status?: string;
};

function getRequirementLeadWhere(filters: RequirementLeadFilters) {
  const where: Prisma.RequirementLeadWhereInput = {};
  const query = filters.q?.trim();

  if (filters.status && Object.values(LeadStatus).includes(filters.status as LeadStatus)) {
    where.status = filters.status as LeadStatus;
  }

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { phone: { contains: query } },
      { carName: { contains: query } },
      { details: { contains: query } },
    ];
  }

  return where;
}

async function getRequirementLeads(filters: RequirementLeadFilters) {
  const pagination = getPaginationState(filters);
  const where = getRequirementLeadWhere(filters);
  const [total, leads] = await Promise.all([
    prisma.requirementLead.count({ where }),
    prisma.requirementLead.findMany({
      orderBy: { createdAt: filters.sort === "oldest" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.take,
      where,
      select: {
        carName: true,
        createdAt: true,
        details: true,
        id: true,
        imageUrls: true,
        mileage: true,
        model: true,
        modelYear: true,
        name: true,
        phone: true,
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

async function getRequirementLeadStats() {
  const [total, newLeads, reviewedLeads, closedLeads] = await Promise.all([
    prisma.requirementLead.count(),
    prisma.requirementLead.count({ where: { status: LeadStatus.NEW } }),
    prisma.requirementLead.count({ where: { status: LeadStatus.REVIEWED } }),
    prisma.requirementLead.count({ where: { status: LeadStatus.CLOSED } }),
  ]);

  return { closedLeads, newLeads, reviewedLeads, total };
}

export default async function AdminRequirementLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: RequirementLeadFilters = {
    page: getStringParam(params.page),
    pageSize: getStringParam(params.pageSize),
    q: getStringParam(params.q),
    sort: getStringParam(params.sort),
    status: getStringParam(params.status),
  };
  const [leadsPage, stats] = await Promise.all([getRequirementLeads(filters), getRequirementLeadStats()]);
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
          <h1>Requirement Leads</h1>
          <span>Review customer vehicle requirements, uploaded images, details, and follow-up status.</span>
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
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Name, phone, car, details" />
          </label>
          <label>
            <span>Status</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              {requirementLeadStatusOptions.map((option) => (
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
          <Link className={styles.secondaryLinkButton} href="/admin/requirement-leads">
            Reset
          </Link>
        </form>

        <div className={styles.listHeader}>
          <div>
            <p>Lead Inbox</p>
            <h2>Database requirement leads</h2>
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
                    <dt>Model Year</dt>
                    <dd>{lead.modelYear || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Mileage</dt>
                    <dd>{lead.mileage || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>Images</dt>
                    <dd>{lead.imageUrls.length}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{lead.createdAtLabel}</dd>
                  </div>
                  <div>
                    <dt>Details</dt>
                    <dd>{lead.details || "Not set"}</dd>
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

                <RequirementLeadRowActions leadId={lead.id} leadName={lead.carName} status={lead.status} />
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>No requirement leads found</strong>
            <p>Adjust the filters or wait for new Send Requirements submissions.</p>
          </div>
        )}
        <AdminPagination
          basePath="/admin/requirement-leads"
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
