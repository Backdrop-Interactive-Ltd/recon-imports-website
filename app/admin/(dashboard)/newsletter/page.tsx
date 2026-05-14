import { prisma } from "../../../../lib/prisma";
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

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

async function getNewsletterSubscribers() {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      createdAt: true,
      email: true,
      id: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return subscribers.map((subscriber) => ({
    ...subscriber,
    createdAtLabel: dateFormatter.format(subscriber.createdAt),
    updatedAtLabel: dateFormatter.format(subscriber.updatedAt),
  }));
}

export default async function AdminNewsletterPage() {
  const subscribers = await getNewsletterSubscribers();
  const activeSubscribers = subscribers.filter((subscriber) => subscriber.isActive).length;
  const inactiveSubscribers = subscribers.length - activeSubscribers;

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
          <strong>{subscribers.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeSubscribers}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveSubscribers}</strong>
        </div>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div>
            <p>Subscriber List</p>
            <h2>Database newsletter subscribers</h2>
          </div>
          <span>{subscribers.length} total</span>
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
            <strong>No newsletter subscribers yet</strong>
            <p>Footer newsletter form submissions will appear here.</p>
          </div>
        )}
      </section>
    </section>
  );
}
