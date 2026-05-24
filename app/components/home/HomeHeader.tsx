"use client";

import { ChevronRight, Download, Menu, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { HomepageSearchItem } from "../../homeTypes";
import type { PublicSiteSettings } from "../../../lib/siteSettingsConfig";
import PublicLogoImage from "../PublicLogoImage";

const SearchOverlay = dynamic(() => import("./SearchOverlay"));

type NavItem =
  | { label: string; href: string; target?: never }
  | { label: string; target: string; href?: never };

const navItems: NavItem[] = [
  { label: "Brand New", href: "/brand-new" },
  { label: "Reconditioned", href: "/reconditioned" },
  { label: "Pre-Owned", href: "/pre-owned" },
  { label: "Pre-Order", href: "/pre-order" },
  { label: "Send Requirements", href: "/send-requirements" },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

type HomeHeaderProps = {
  phoneHref: string;
  searchItems: HomepageSearchItem[];
  siteSettings: PublicSiteSettings;
};

export default function HomeHeader({ phoneHref, searchItems, siteSettings }: HomeHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerGlass, setHeaderGlass] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function updateHeaderGlass() {
      const shouldUseGlass = window.scrollY > 24;
      setHeaderGlass(shouldUseGlass);
      headerRef.current?.classList.toggle("glass", shouldUseGlass);
    }

    updateHeaderGlass();
    window.addEventListener("scroll", updateHeaderGlass, { passive: true });
    window.addEventListener("pageshow", updateHeaderGlass);
    window.addEventListener("focus", updateHeaderGlass);
    window.addEventListener("hashchange", updateHeaderGlass);

    return () => {
      window.removeEventListener("scroll", updateHeaderGlass);
      window.removeEventListener("pageshow", updateHeaderGlass);
      window.removeEventListener("focus", updateHeaderGlass);
      window.removeEventListener("hashchange", updateHeaderGlass);
    };
  }, []);

  function goToPage(href: string) {
    setMobileMenuOpen(false);
    window.location.assign(href);
  }

  return (
    <>
      <div className="top-strip">
        <a className="phone-link" href={phoneHref || "tel:+8801886589009"}>
          <span className="phone-dot" />
          {siteSettings.phoneNumber || "+880 1886-589009"}
        </a>
        <a href={phoneHref || "tel:+8801886589009"}>
          Showroom <ChevronRight size={14} />
        </a>
      </div>

      <header ref={headerRef} className={headerGlass ? "site-header glass compact" : "site-header"}>
        <button
          className="icon-button menu-button"
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <PublicLogoImage
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={siteSettings.siteName}
            width={178}
            height={55}
            loading="eager"
            priority
            sizes="178px"
          />
        </button>

        <nav className={mobileMenuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.href) {
                  goToPage(item.href);
                  return;
                }

                if (item.target) {
                  scrollToSection(item.target);
                }
                setMobileMenuOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <a className="download-button" href="/stock-list.pdf" download>
            <Download size={17} />
            Download Stock List
          </a>
          <button className="search-button" type="button" aria-label="Search stock" onClick={() => setSearchOpen(true)}>
            <Search size={29} strokeWidth={1.35} />
          </button>
        </div>
      </header>

      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} searchItems={searchItems} /> : null}
    </>
  );
}
