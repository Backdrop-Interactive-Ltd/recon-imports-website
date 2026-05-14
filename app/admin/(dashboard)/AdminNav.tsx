"use client";

import {
  BarChart3,
  Car,
  ClipboardList,
  FileCheck2,
  FolderKanban,
  Home,
  Image,
  Mail,
  Settings,
  Tags,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/cars", label: "Cars", icon: Car },
  { href: "/admin/brands", label: "Brands", icon: Tags },
  { href: "/admin/categories", label: "Categories", icon: FolderKanban },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/sell-car-leads", label: "Sell Car Leads", icon: UsersRound },
  { href: "/admin/requirement-leads", label: "Requirement Leads", icon: ClipboardList },
  { href: "/admin/auction-sheet-requests", label: "Auction Sheets", icon: FileCheck2 },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/site-settings", label: "Site Settings", icon: Settings },
  { href: "/admin/media", label: "Media", icon: Image },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin navigation">
      {adminNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;

        return (
          <Link className={isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink} href={item.href} key={item.href}>
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
