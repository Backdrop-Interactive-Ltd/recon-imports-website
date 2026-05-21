import Link from "next/link";
import { Car, ClipboardList, ListChecks } from "lucide-react";
import CarsSubnav from "./CarsSubnav";
import { getAdminCarStats } from "./queries";
import styles from "../brands/page.module.css";

export const metadata = {
  title: "Cars | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

const actionCards = [
  {
    copy: "Create a new inventory item with images, specifications, features, and publishing controls.",
    href: "/admin/cars/add",
    icon: Car,
    label: "Add Cars",
  },
  {
    copy: "Edit existing cars, update images and details, publish or unpublish, feature, and delete inventory.",
    href: "/admin/cars/manage",
    icon: ClipboardList,
    label: "Manage Cars",
  },
  {
    copy: "Review the full inventory in a compact list with filters for status, type, brand, price, and year.",
    href: "/admin/cars/list",
    icon: ListChecks,
    label: "Cars List",
  },
];

export default async function AdminCarsOverviewPage() {
  const stats = await getAdminCarStats();

  return (
    <section className={styles.brandsPage}>
      <div className={styles.header}>
        <div>
          <p>Inventory</p>
          <h1>Cars</h1>
          <span>Choose a focused cars workflow: add, manage, or review inventory.</span>
        </div>
      </div>

      <CarsSubnav />

      <div className={styles.summaryGrid}>
        <div>
          <span>Total Cars</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Published</span>
          <strong>{stats.published}</strong>
        </div>
        <div>
          <span>Sold</span>
          <strong>{stats.sold}</strong>
        </div>
      </div>

      <div className={styles.actionCardGrid}>
        {actionCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link className={styles.actionCard} href={card.href} key={card.href}>
              <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
              <h2>{card.label}</h2>
              <p>{card.copy}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
