"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../brands/page.module.css";

const carNavItems = [
  { href: "/admin/cars", label: "Overview" },
  { href: "/admin/cars/add", label: "Add Cars" },
  { href: "/admin/cars/manage", label: "Manage Cars" },
  { href: "/admin/cars/list", label: "Cars List" },
];

export default function CarsSubnav() {
  const pathname = usePathname();

  return (
    <nav className={styles.subnav} aria-label="Cars admin sections">
      {carNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin/cars" && pathname.startsWith(`${item.href}/`));

        return (
          <Link className={isActive ? `${styles.subnavLink} ${styles.subnavLinkActive}` : styles.subnavLink} href={item.href} key={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
