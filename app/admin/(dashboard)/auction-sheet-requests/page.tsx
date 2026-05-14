import { AuctionSheetStatus, PaymentStatus } from "../../../../lib/generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import styles from "../brands/page.module.css";
import AuctionSheetRequestRowActions from "./AuctionSheetRequestRowActions";
import { formatEnumLabel } from "./validation";

export const metadata = {
  title: "Auction Sheet Requests | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-IN");

async function getAuctionSheetRequests() {
  const requests = await prisma.auctionSheetRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      chassisNumber: true,
      createdAt: true,
      email: true,
      feeAmount: true,
      id: true,
      name: true,
      paymentStatus: true,
      phone: true,
      reportUrl: true,
      status: true,
      updatedAt: true,
    },
  });

  return requests.map((request) => ({
    ...request,
    createdAtLabel: dateFormatter.format(request.createdAt),
    feeAmountLabel: `BDT ${numberFormatter.format(request.feeAmount)}`,
    paymentStatusLabel: formatEnumLabel(request.paymentStatus),
    statusLabel: formatEnumLabel(request.status),
    updatedAtLabel: dateFormatter.format(request.updatedAt),
  }));
}

export default async function AdminAuctionSheetRequestsPage() {
  const requests = await getAuctionSheetRequests();
  const pendingPayments = requests.filter((request) => request.paymentStatus === PaymentStatus.PENDING).length;
  const processingRequests = requests.filter((request) => request.status === AuctionSheetStatus.PROCESSING).length;
  const completedRequests = requests.filter((request) => request.status === AuctionSheetStatus.COMPLETED).length;

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
          <strong>{requests.length}</strong>
        </div>
        <div>
          <span>Pending Payment</span>
          <strong>{pendingPayments}</strong>
        </div>
        <div>
          <span>Processing</span>
          <strong>{processingRequests}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{completedRequests}</strong>
        </div>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div>
            <p>Request Inbox</p>
            <h2>Database auction sheet requests</h2>
          </div>
          <span>{requests.length} total</span>
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
            <strong>No auction sheet requests yet</strong>
            <p>Submitted Verify Auction Sheet forms will appear here.</p>
          </div>
        )}
      </section>
    </section>
  );
}
