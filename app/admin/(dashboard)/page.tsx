import { Activity, Car, ClipboardList, FileCheck2, Mail, Tags, UsersRound } from "lucide-react";
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | Recon Imports",
};

const numberFormatter = new Intl.NumberFormat("en-US");

async function getDashboardStats() {
  // Dashboard cards read live CMS counts without connecting the public frontend to the database.
  const [totalCars, totalBrands, sellCarLeads, requirementLeads, auctionSheetRequests, newsletterSubscribers] =
    await Promise.all([
      prisma.car.count(),
      prisma.brand.count(),
      prisma.sellCarLead.count(),
      prisma.requirementLead.count(),
      prisma.auctionSheetRequest.count(),
      prisma.newsletterSubscriber.count(),
    ]);

  return [
    { label: "Total Cars", value: totalCars, href: "/admin/cars", icon: Car },
    { label: "Total Brands", value: totalBrands, href: "/admin/brands", icon: Tags },
    { label: "Sell Your Car Leads", value: sellCarLeads, href: "/admin/sell-car-leads", icon: UsersRound },
    { label: "Requirement Leads", value: requirementLeads, href: "/admin/requirement-leads", icon: ClipboardList },
    {
      label: "Auction Sheet Requests",
      value: auctionSheetRequests,
      href: "/admin/auction-sheet-requests",
      icon: FileCheck2,
    },
    { label: "Newsletter Subscribers", value: newsletterSubscribers, href: "/admin/newsletter", icon: Mail },
  ];
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <section className={styles.dashboard}>
      <div className={styles.heading}>
        <div>
          <p>Dashboard</p>
          <h1>Admin overview</h1>
        </div>
        <span>
          <Activity aria-hidden="true" size={18} strokeWidth={1.8} />
          Live database counts
        </span>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link className={styles.statCard} href={stat.href} key={stat.label}>
              <span className={styles.statIcon}>
                <Icon aria-hidden="true" size={24} strokeWidth={1.7} />
              </span>
              <span className={styles.statLabel}>{stat.label}</span>
              <strong>{numberFormatter.format(stat.value)}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
