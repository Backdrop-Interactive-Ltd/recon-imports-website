"use client";

import { ChevronDown, Download, Menu, Phone, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { HomepageBrand, HomepageSearchItem } from "../../homeTypes";
import type { PublicSiteSettings } from "../../../lib/siteSettingsConfig";
import PublicLogoImage from "../PublicLogoImage";
import styles from "./HomeHeader.module.css";

const SearchOverlay = dynamic(() => import("./SearchOverlay"));
const inventoryLinks = [
  { label: "Brand New", href: "/brand-new" },
  { label: "Reconditioned", href: "/reconditioned" },
  { label: "Pre-Owned", href: "/pre-owned" },
  { label: "Pre-Order", href: "/pre-order" },
];
const menuItems = ["Home", "Inventory", "Brands", "Gallery", "Stock List", "Request Car", "Verify Auction", "Saved Cars", "Compare", "About Us", "Payments", "Contact"];

type HomeHeaderProps = {
  phoneHref: string;
  searchItems: HomepageSearchItem[];
  siteSettings: PublicSiteSettings;
  brands?: HomepageBrand[];
};

export default function HomeHeader({ phoneHref, searchItems, siteSettings, brands = [] }: HomeHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const inventoryRef = useRef<HTMLButtonElement>(null);
  const brandsRef = useRef<HTMLButtonElement>(null);
  const telephone = phoneHref || "tel:+8801886589009";

  function closeMenus() { setMobileMenuOpen(false); setDropdown(null); }

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pageshow", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("pageshow", update); };
  }, []);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) closeMenus();
    }
    const breakpoint = window.matchMedia("(min-width: 1200px)");
    const resize = () => closeMenus();
    document.addEventListener("pointerdown", outside);
    breakpoint.addEventListener("change", resize);
    return () => { document.removeEventListener("pointerdown", outside); breakpoint.removeEventListener("change", resize); };
  }, []);

  const destinations: Record<string, string> = {
    Home: "/", "Stock List": "/stock-list.pdf", "Request Car": "/send-requirements",
    "Verify Auction": "/verify-auction-sheet", "About Us": "/about-us", Contact: telephone,
  };

  return (
    <>
      <header ref={headerRef} className={[styles.header, scrolled ? styles.scrolled : "", mobileMenuOpen ? styles.menuOpen : ""].join(" ")}
        onKeyDown={event => {
          if (event.key === "Escape") {
            if (dropdown) { (dropdown === "Inventory" ? inventoryRef : brandsRef).current?.focus(); setDropdown(null); }
            else if (mobileMenuOpen) { closeMenus(); menuRef.current?.focus(); }
          }
        }}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenus(); }}>
        <div className={styles.upper}>
          <div className={styles.left}>
            <button ref={menuRef} className={styles.hamburger} type="button" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileMenuOpen} aria-controls="homepage-navigation" onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setDropdown(null); }}>
              {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
            <a className={styles.phone} href={telephone}><Phone size={15} aria-hidden="true" /><span>{siteSettings.phoneNumber || "+880 1886-589009"}</span></a>
          </div>
          <a className={styles.logo} href="/" aria-label="RECON IMPORTS home" onClick={closeMenus}>
            <PublicLogoImage src={siteSettings.websiteLogo || "/recon-logo.webp"} alt={`${siteSettings.siteName || "Recon Imports"} logo`}
              width={178} height={55} loading="eager" priority sizes="(max-width: 599px) 140px, 178px" />
          </a>
          <div className={styles.actions}>
            <a className={styles.stock} href="/stock-list.pdf" download><Download size={16} aria-hidden="true" /><span>Stock List</span></a>
            <button className={styles.search} type="button" aria-label="Search stock" onClick={() => { closeMenus(); setSearchOpen(true); }}><Search size={22} aria-hidden="true" /></button>
          </div>
        </div>
        <nav id="homepage-navigation" className={styles.navigation} aria-label="Main navigation">
          <ul className={styles.links}>
            {menuItems.map(label => {
              if (label === "Inventory" || label === "Brands") {
                const items = label === "Inventory" ? inventoryLinks : brands.map(brand => ({ label: brand.name, href: `/${encodeURIComponent(brand.slug)}` }));
                return <li key={label} className={styles.dropdown}>
                  <button ref={label === "Inventory" ? inventoryRef : brandsRef} className={styles.navItem} type="button" aria-expanded={dropdown === label} aria-controls={`header-${label.toLowerCase()}`}
                    onClick={() => setDropdown(dropdown === label ? null : label)}>{label}<ChevronDown size={12} aria-hidden="true" /></button>
                  <ul id={`header-${label.toLowerCase()}`} className={styles.dropdownPanel} hidden={dropdown !== label}>
                    {items.map(item => <li key={item.href}><a href={item.href} onClick={closeMenus}>{item.label}</a></li>)}
                    {!items.length ? <li className={styles.empty}>No brands available</li> : null}
                  </ul>
                </li>;
              }
              if (!destinations[label]) return <li key={label}><span className={styles.unavailable} aria-disabled="true" title={`${label} is not available yet`}>{label}<span className={styles.srOnly}> — not available yet</span></span></li>;
              return <li key={label}><a className={styles.navItem} href={destinations[label]} aria-current={label === "Home" ? "page" : undefined}
                download={label === "Stock List" || undefined} onClick={closeMenus}>{label}</a></li>;
            })}
          </ul>
        </nav>
      </header>
      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} searchItems={searchItems} /> : null}
    </>
  );
}