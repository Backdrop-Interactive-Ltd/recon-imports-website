import { LeadStatus } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import styles from "../brands/page.module.css";
import SellCarLeadRowActions from "./SellCarLeadRowActions";
import { formatLeadStatus } from "./validation";

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

async function getSellCarLeads() {
  const leads = await prisma.sellCarLead.findMany({
    orderBy: { createdAt: "desc" },
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
  });

  return leads.map((lead) => ({
    ...lead,
    createdAtLabel: dateFormatter.format(lead.createdAt),
    statusLabel: formatLeadStatus(lead.status),
    updatedAtLabel: dateFormatter.format(lead.updatedAt),
  }));
}

export default async function AdminSellCarLeadsPage() {
  const leads = await getSellCarLeads();
  const newLeads = leads.filter((lead) => lead.status === LeadStatus.NEW).length;
  const reviewedLeads = leads.filter((lead) => lead.status === LeadStatus.REVIEWED).length;
  const closedLeads = leads.filter((lead) => lead.status === LeadStatus.CLOSED).length;

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
          <strong>{leads.length}</strong>
        </div>
        <div>
          <span>New</span>
          <strong>{newLeads}</strong>
        </div>
        <div>
          <span>Reviewed</span>
          <strong>{reviewedLeads}</strong>
        </div>
        <div>
          <span>Closed</span>
          <strong>{closedLeads}</strong>
        </div>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div>
            <p>Lead Inbox</p>
            <h2>Database sell car leads</h2>
          </div>
          <span>{leads.length} total</span>
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
            <strong>No sell car leads yet</strong>
            <p>Submitted Sell Your Car forms will appear here.</p>
          </div>
        )}
      </section>
    </section>
  );
}
