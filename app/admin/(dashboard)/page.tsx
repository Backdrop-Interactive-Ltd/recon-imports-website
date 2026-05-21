import {
  Activity,
  Car,
  ClipboardList,
  FileCheck2,
  Image,
  Mail,
  Plus,
  Settings,
  Tags,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | Recon Imports",
};

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

type ActivityItem = {
  badge?: string;
  href: string;
  id: string;
  meta: string;
  title: string;
};

type ActivitySection = {
  emptyText: string;
  href: string;
  items: ActivityItem[];
  title: string;
};

async function safeQuery<T>(label: string, fallback: T, query: () => Promise<T>) {
  try {
    return await query();
  } catch (error) {
    console.error(`Failed to load admin dashboard ${label}.`, error);
    return fallback;
  }
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function getDashboardStats() {
  const [totalCars, totalBrands, sellCarLeads, requirementLeads, auctionSheetRequests, newsletterSubscribers] =
    await Promise.all([
      safeQuery("total cars", 0, () => prisma.car.count()),
      safeQuery("total brands", 0, () => prisma.brand.count()),
      safeQuery("sell car leads", 0, () => prisma.sellCarLead.count()),
      safeQuery("requirement leads", 0, () => prisma.requirementLead.count()),
      safeQuery("auction sheet requests", 0, () => prisma.auctionSheetRequest.count()),
      safeQuery("newsletter subscribers", 0, () => prisma.newsletterSubscriber.count()),
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

async function getRecentActivity(): Promise<ActivitySection[]> {
  const [cars, sellCarLeads, requirementLeads, auctionSheetRequests, newsletterSubscribers] = await Promise.all([
    safeQuery("latest cars", [], () =>
      prisma.car.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          brand: { select: { name: true } },
          createdAt: true,
          id: true,
          isPublished: true,
          price: true,
          title: true,
          year: true,
        },
        take: 5,
      }),
    ),
    safeQuery("latest sell car leads", [], () =>
      prisma.sellCarLead.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          carName: true,
          createdAt: true,
          id: true,
          name: true,
          status: true,
        },
        take: 5,
      }),
    ),
    safeQuery("latest requirement leads", [], () =>
      prisma.requirementLead.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          carName: true,
          createdAt: true,
          id: true,
          name: true,
          status: true,
        },
        take: 5,
      }),
    ),
    safeQuery("latest auction sheet requests", [], () =>
      prisma.auctionSheetRequest.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          chassisNumber: true,
          createdAt: true,
          id: true,
          paymentStatus: true,
          status: true,
        },
        take: 5,
      }),
    ),
    safeQuery("latest newsletter subscribers", [], () =>
      prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          email: true,
          id: true,
          isActive: true,
        },
        take: 5,
      }),
    ),
  ]);

  return [
    {
      emptyText: "No cars have been added yet.",
      href: "/admin/cars/list",
      items: cars.map((car) => ({
        badge: car.isPublished ? "Published" : "Draft",
        href: `/admin/cars/manage/${car.id}`,
        id: car.id,
        meta: `${car.brand.name} | ${car.year} | BDT ${numberFormatter.format(car.price)}`,
        title: car.title,
      })),
      title: "Latest Cars",
    },
    {
      emptyText: "No sell car leads yet.",
      href: "/admin/sell-car-leads",
      items: sellCarLeads.map((lead) => ({
        badge: formatEnumLabel(lead.status),
        href: "/admin/sell-car-leads",
        id: lead.id,
        meta: `${lead.name} | ${dateFormatter.format(lead.createdAt)}`,
        title: lead.carName,
      })),
      title: "Latest Sell Car Leads",
    },
    {
      emptyText: "No requirement leads yet.",
      href: "/admin/requirement-leads",
      items: requirementLeads.map((lead) => ({
        badge: formatEnumLabel(lead.status),
        href: "/admin/requirement-leads",
        id: lead.id,
        meta: `${lead.name} | ${dateFormatter.format(lead.createdAt)}`,
        title: lead.carName,
      })),
      title: "Latest Requirement Leads",
    },
    {
      emptyText: "No auction sheet requests yet.",
      href: "/admin/auction-sheet-requests",
      items: auctionSheetRequests.map((request) => ({
        badge: formatEnumLabel(request.paymentStatus),
        href: "/admin/auction-sheet-requests",
        id: request.id,
        meta: `${formatEnumLabel(request.status)} | ${dateFormatter.format(request.createdAt)}`,
        title: request.chassisNumber,
      })),
      title: "Latest Auction Sheet Requests",
    },
    {
      emptyText: "No newsletter subscribers yet.",
      href: "/admin/newsletter",
      items: newsletterSubscribers.map((subscriber) => ({
        badge: subscriber.isActive ? "Active" : "Inactive",
        href: "/admin/newsletter",
        id: subscriber.id,
        meta: dateFormatter.format(subscriber.createdAt),
        title: subscriber.email,
      })),
      title: "Latest Newsletter Subscribers",
    },
  ];
}

const quickActions = [
  { label: "Add Car", href: "/admin/cars/add", icon: Plus },
  { label: "Add Brand", href: "/admin/brands", icon: Tags },
  { label: "Manage Hero Slides", href: "/admin/homepage", icon: Activity },
  { label: "Site Settings", href: "/admin/site-settings", icon: Settings },
  { label: "Media Library", href: "/admin/media", icon: Image },
];

export default async function AdminDashboardPage() {
  const [stats, activitySections] = await Promise.all([getDashboardStats(), getRecentActivity()]);

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

      <section className={styles.quickPanel} aria-labelledby="quick-actions-title">
        <div className={styles.sectionHeader}>
          <div>
            <p>Shortcuts</p>
            <h2 id="quick-actions-title">Quick actions</h2>
          </div>
        </div>
        <div className={styles.quickGrid}>
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link className={styles.quickAction} href={action.href} key={action.href}>
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.activityGrid} aria-label="Recent admin activity">
        {activitySections.map((section) => (
          <article className={styles.activityPanel} key={section.title}>
            <div className={styles.sectionHeader}>
              <div>
                <p>Recent</p>
                <h2>{section.title}</h2>
              </div>
              <Link href={section.href}>View all</Link>
            </div>

            {section.items.length > 0 ? (
              <div className={styles.activityList}>
                {section.items.map((item) => (
                  <Link className={styles.activityItem} href={item.href} key={`${section.title}-${item.id}`}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </span>
                    {item.badge ? <em>{item.badge}</em> : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>{section.emptyText}</p>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}
