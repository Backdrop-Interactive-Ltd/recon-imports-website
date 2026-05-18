"use client";

import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  BusFront,
  Car,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Menu,
  MessageCircle,
  Search,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { brandOptions } from "./car-stocks/brands";
import { formatPrice, inventory } from "./car-stocks/inventory";
import Footer from "./components/Footer";
import { fallbackSiteSettings, type PublicSiteSettings } from "../lib/siteSettingsConfig";

export type HomepageBrand = {
  logoUrl?: string | null;
  name: string;
  slug: string;
};

export type HomepageCategory = {
  copy: string;
  href: string;
  iconKey?: string | null;
  id: string;
  image: string;
  imageAlt?: string | null;
  title: string;
};

export type HomepageHeroSlide = {
  ctaLink?: string | null;
  ctaText?: string | null;
  image: string;
  imageClass: string;
  subtitle?: string | null;
  textAnimation: string;
  title: string;
};

type NavItem =
  | { label: string; href: string; target?: never }
  | { label: string; target: string; href?: never };

// Main homepage navigation. Route links open full pages, target links scroll inside the homepage.
const navItems: NavItem[] = [
  { label: "Car Stocks", href: "/car-stocks" },
  { label: "Reconditioned", href: "/reconditioned" },
  { label: "EVS", href: "/ev" },
  { label: "Pre-Owner", href: "/pre-owned" },
  { label: "Pre-Order", href: "/pre-order" },
  { label: "Send Requirements", href: "/send-requirements" },
];

const fallbackHeroSlides: HomepageHeroSlide[] = [
  {
    title: "Explore a world of affordable options",
    image: "/hero-slide-1.webp",
    imageClass: "hero-image-default",
    textAnimation: "hero-text-rise",
  },
  {
    title: "Discover spacious comfort and reliability",
    image: "/hero-slide-2.webp",
    imageClass: "hero-image-focus-left",
    textAnimation: "hero-text-track",
  },
  {
    title: "Drive away with unbeatable deals",
    image: "/hero-slide-3.webp",
    imageClass: "hero-image-focus-right",
    textAnimation: "hero-text-scale",
  },
];

const fallbackCategories: HomepageCategory[] = [
  {
    id: "sedan",
    title: "Sedan",
    href: "/sedan",
    copy: "Comfortable city driving with a refined passenger-first profile.",
    iconKey: "car",
    image: "/stock-axio.webp",
    imageAlt: "Sedan vehicle detail",
  },
  {
    id: "hatchback",
    title: "Hatchback",
    href: "/hatchback",
    copy: "Compact, practical, and easy to handle for daily movement.",
    iconKey: "car",
    image: "/stock-noah-white.webp",
    imageAlt: "Hatchback vehicle detail",
  },
  {
    id: "suv",
    title: "SUV",
    href: "/suv",
    copy: "Spacious and versatile for power and adventure.",
    iconKey: "car",
    image: "/cat-suv.webp",
    imageAlt: "SUV vehicle detail",
  },
  {
    id: "crossover",
    title: "Crossover",
    href: "/crossover",
    copy: "Blending sedan agility with the versatile, elevated stance of an SUV.",
    iconKey: "car",
    image: "/cat-crossover.webp",
    imageAlt: "Crossover vehicle detail",
  },
  {
    id: "mpv",
    title: "MPV",
    href: "/mpv",
    copy: "Multi-purpose vehicles designed for maximum seating and flexibility.",
    iconKey: "car",
    image: "/cat-mpv.webp",
    imageAlt: "MPV vehicle detail",
  },
  {
    id: "passenger-van",
    title: "Passenger Van",
    href: "/passenger-van",
    copy: "Roomy passenger transport for groups, families, and business needs.",
    iconKey: "car",
    image: "/cat-wagon.webp",
    imageAlt: "Passenger Van vehicle detail",
  },
];

const categoryIconByKey: Record<string, typeof Car> = {
  bus: BusFront,
  car: Car,
  crossover: CarFront,
  electric: Zap,
  ev: Zap,
  mpv: BusFront,
  "passenger-van": BusFront,
  sedan: CarFront,
  suv: Truck,
  truck: Truck,
  van: BusFront,
};

const preferenceOptions = [
  {
    title: "Reconditioned Unit",
    href: "/reconditioned",
    image: "/hero-slide-2.webp",
  },
  {
    title: "Pre-owned Unit",
    href: "/pre-owned",
    image: "/hero-slide-3.webp",
  },
  {
    title: "Pre-Order Unit",
    href: "/pre-order",
    image: "/cat-crossover.webp",
  },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

type HomeClientProps = {
  brands?: HomepageBrand[];
  categories?: HomepageCategory[];
  heroSlides?: HomepageHeroSlide[];
  siteSettings?: PublicSiteSettings;
};

const fallbackBrands: HomepageBrand[] = brandOptions.map((brand) => ({
  logoUrl: null,
  name: brand.name,
  slug: brand.slug,
}));

export default function HomeClient({
  brands = fallbackBrands,
  categories = fallbackCategories,
  heroSlides = fallbackHeroSlides,
  siteSettings = fallbackSiteSettings,
}: HomeClientProps) {
  const [slide, setSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState(54);
  const [auctionVin, setAuctionVin] = useState("");
  const [stockDragging, setStockDragging] = useState(false);
  const [purposeDragging, setPurposeDragging] = useState(false);
  const [brandSlide, setBrandSlide] = useState(0);
  const [headerGlass, setHeaderGlass] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const stockRowRef = useRef<HTMLDivElement>(null);
  const purposeRowRef = useRef<HTMLDivElement>(null);
  const stockDragRef = useRef({
    active: false,
    moved: false,
    hovered: false,
    pendingHref: "",
    suppressClick: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const purposeDragRef = useRef({
    active: false,
    moved: false,
    hovered: false,
    pendingHref: "",
    suppressClick: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const brandLogoPages = useMemo(
    () => Array.from({ length: Math.ceil(brands.length / 9) }, (_, index) => brands.slice(index * 9, index * 9 + 9)),
    [brands],
  );
  const latestStock = useMemo(() => inventory.slice(-10).reverse(), []);
  const filteredStock = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesBudget = item.price <= budget * 100000;
      const matchesQuery =
        !normalizedQuery ||
        `${item.brand} ${item.name} ${item.year} ${item.body} ${item.type}`.toLowerCase().includes(normalizedQuery);

      return matchesBudget && matchesQuery;
    });
  }, [budget, query]);
  const carouselStock = [...latestStock, ...latestStock];
  const shouldLoopPurposeCategories = categories.length > 1;
  const carouselCategories = shouldLoopPurposeCategories ? [...categories, ...categories] : categories;
  const purposeSectionTitle = siteSettings.homepagePurposeSectionTitle || "Explore vehicles that suit your purpose";
  const phoneHref = siteSettings.phoneNumber ? `tel:${siteSettings.phoneNumber.replace(/[^\d+]/g, "")}` : "";
  const whatsappHref = siteSettings.whatsappNumber ? `https://wa.me/${siteSettings.whatsappNumber.replace(/[^\d]/g, "")}` : "";

  useEffect(() => {
    let animationFrame = 0;
    let isRunning = false;

    function animateStockRow() {
      const row = stockRowRef.current;

      if (!isRunning) {
        return;
      }

      if (row && latestStock.length > 0 && !stockDragRef.current.active && !stockDragRef.current.hovered) {
        const resetPoint = row.scrollWidth / 2;
        row.scrollLeft += 0.65;

        if (row.scrollLeft >= resetPoint) {
          row.scrollLeft -= resetPoint;
        }
      }

      animationFrame = requestAnimationFrame(animateStockRow);
    }

    function startStockRow() {
      cancelAnimationFrame(animationFrame);
      stockDragRef.current.active = false;
      stockDragRef.current.moved = false;
      stockDragRef.current.pendingHref = "";
      stockDragRef.current.suppressClick = false;
      isRunning = true;
      animationFrame = requestAnimationFrame(animateStockRow);
    }

    function handleVisibleStockRow() {
      if (document.visibilityState === "visible") {
        startStockRow();
      }
    }

    startStockRow();
    window.addEventListener("pageshow", startStockRow);
    window.addEventListener("focus", startStockRow);
    document.addEventListener("visibilitychange", handleVisibleStockRow);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("pageshow", startStockRow);
      window.removeEventListener("focus", startStockRow);
      document.removeEventListener("visibilitychange", handleVisibleStockRow);
    };
  }, [latestStock.length]);

  useEffect(() => {
    let animationFrame = 0;
    let initialized = false;
    let isRunning = false;

    function animatePurposeRow() {
      const row = purposeRowRef.current;

      if (!isRunning) {
        return;
      }

      if (row && shouldLoopPurposeCategories) {
        const resetPoint = row.scrollWidth / 2;

        if (!initialized && resetPoint > 0) {
          row.scrollLeft = resetPoint;
          initialized = true;
        }

        if (resetPoint > 0 && !purposeDragRef.current.active) {
          if (row.scrollLeft <= 1) {
            row.scrollLeft += resetPoint;
          }

          row.scrollLeft -= 1.35;
        }
      }

      animationFrame = requestAnimationFrame(animatePurposeRow);
    }

    function startPurposeRow() {
      cancelAnimationFrame(animationFrame);
      purposeDragRef.current.active = false;
      purposeDragRef.current.moved = false;
      purposeDragRef.current.pendingHref = "";
      purposeDragRef.current.suppressClick = false;
      setPurposeDragging(false);
      initialized = false;
      isRunning = true;
      animationFrame = requestAnimationFrame(animatePurposeRow);
    }

    function handleVisiblePurposeRow() {
      if (document.visibilityState === "visible") {
        startPurposeRow();
      }
    }

    startPurposeRow();
    window.addEventListener("pageshow", startPurposeRow);
    window.addEventListener("focus", startPurposeRow);
    document.addEventListener("visibilitychange", handleVisiblePurposeRow);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("pageshow", startPurposeRow);
      window.removeEventListener("focus", startPurposeRow);
      document.removeEventListener("visibilitychange", handleVisiblePurposeRow);
    };
  }, [shouldLoopPurposeCategories]);

  useEffect(() => {
    function resetPurposeLoop() {
      const row = purposeRowRef.current;

      if (!row) {
        return;
      }

      const resetPoint = row.scrollWidth / 2;

      if (shouldLoopPurposeCategories && resetPoint > 0) {
        row.scrollLeft = resetPoint;
      } else {
        row.scrollLeft = 0;
      }
    }

    resetPurposeLoop();
    window.addEventListener("resize", resetPurposeLoop);

    return () => window.removeEventListener("resize", resetPurposeLoop);
  }, [shouldLoopPurposeCategories]);

  useEffect(() => {
    if (stockRowRef.current) {
      stockRowRef.current.scrollLeft = 0;
    }
  }, [query, budget]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    if (brandLogoPages.length <= 1) return;

    const interval = window.setInterval(() => {
      setBrandSlide((current) => (current + 1) % brandLogoPages.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, [brandLogoPages.length]);

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

  useEffect(() => {
    function restoreHomeInteractions() {
      stockDragRef.current.active = false;
      stockDragRef.current.moved = false;
      stockDragRef.current.pendingHref = "";
      stockDragRef.current.suppressClick = false;
      purposeDragRef.current.active = false;
      purposeDragRef.current.moved = false;
      purposeDragRef.current.pendingHref = "";
      purposeDragRef.current.suppressClick = false;
      setStockDragging(false);
      setPurposeDragging(false);
      const syncHeaderGlass = () => {
        const shouldUseGlass = window.scrollY > 24;
        setHeaderGlass(shouldUseGlass);
        headerRef.current?.classList.toggle("glass", shouldUseGlass);
      };
      syncHeaderGlass();
      requestAnimationFrame(syncHeaderGlass);
      window.setTimeout(syncHeaderGlass, 80);
      window.setTimeout(syncHeaderGlass, 260);
      window.setTimeout(syncHeaderGlass, 700);
    }

    function handleVisibleRestore() {
      if (document.visibilityState === "visible") {
        restoreHomeInteractions();
      }
    }

    window.addEventListener("pageshow", restoreHomeInteractions);
    window.addEventListener("focus", restoreHomeInteractions);
    document.addEventListener("visibilitychange", handleVisibleRestore);

    return () => {
      window.removeEventListener("pageshow", restoreHomeInteractions);
      window.removeEventListener("focus", restoreHomeInteractions);
      document.removeEventListener("visibilitychange", handleVisibleRestore);
    };
  }, []);

  function nextSlide() {
    setSlide((current) => (current + 1) % heroSlides.length);
  }

  function previousSlide() {
    setSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  }

  function downloadStockList() {
    const rows = [
      ["Brand", "Model", "Year", "Body", "Type", "Mileage", "Price"],
      ...inventory.map((item) => [
        item.brand,
        item.name,
        item.year,
        item.body,
        item.type,
        item.mileage,
        formatPrice(item.price),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reliant-motors-stock-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleStockPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;

    if (!row) {
      return;
    }

    stockDragRef.current.active = true;
    stockDragRef.current.moved = false;
    stockDragRef.current.pendingHref =
      (event.target as HTMLElement).closest<HTMLAnchorElement>(".deals-stock-card")?.getAttribute("href") ?? "";
    stockDragRef.current.suppressClick = false;
    stockDragRef.current.startX = event.clientX;
    stockDragRef.current.startScrollLeft = row.scrollLeft;
    setStockDragging(true);
    row.setPointerCapture(event.pointerId);
  }

  function handleStockPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;

    if (!row || !stockDragRef.current.active) {
      return;
    }

    const resetPoint = row.scrollWidth / 2;
    const dragDistance = event.clientX - stockDragRef.current.startX;
    if (Math.abs(dragDistance) > 5) {
      stockDragRef.current.moved = true;
      event.preventDefault();
    }
    let nextScrollLeft = stockDragRef.current.startScrollLeft - dragDistance * 1.35;

    if (nextScrollLeft < 0) {
      nextScrollLeft += resetPoint;
    }

    if (nextScrollLeft >= resetPoint) {
      nextScrollLeft -= resetPoint;
    }

    row.scrollLeft = nextScrollLeft;
  }

  function handleStockPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;
    const shouldNavigate = !stockDragRef.current.moved && stockDragRef.current.pendingHref;
    const nextHref = stockDragRef.current.pendingHref;

    stockDragRef.current.active = false;
    stockDragRef.current.pendingHref = "";
    setStockDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }

    if (shouldNavigate) {
      stockDragRef.current.suppressClick = true;
      window.location.assign(nextHref);
    }
  }

  function cancelStockDrag(event: React.PointerEvent<HTMLDivElement>) {
    const row = stockRowRef.current;

    stockDragRef.current.active = false;
    stockDragRef.current.pendingHref = "";
    setStockDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }
  }

  function stopStockDrag() {
    stockDragRef.current.active = false;
    stockDragRef.current.pendingHref = "";
    setStockDragging(false);
  }

  function handleDealCardClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (stockDragRef.current.moved || stockDragRef.current.suppressClick) {
      event.preventDefault();
      stockDragRef.current.moved = false;
      stockDragRef.current.suppressClick = false;
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  function handlePurposePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const row = purposeRowRef.current;

    if (!row) {
      return;
    }

    purposeDragRef.current.active = true;
    purposeDragRef.current.moved = false;
    purposeDragRef.current.pendingHref =
      (event.target as HTMLElement).closest<HTMLAnchorElement>(".category-card")?.getAttribute("href") ?? "";
    purposeDragRef.current.startX = event.clientX;
    purposeDragRef.current.startScrollLeft = row.scrollLeft;
    setPurposeDragging(true);
    row.setPointerCapture(event.pointerId);
  }

  function handlePurposePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const row = purposeRowRef.current;

    if (!row || !purposeDragRef.current.active) {
      return;
    }

    const resetPoint = row.scrollWidth / 2;
    const dragDistance = event.clientX - purposeDragRef.current.startX;
    if (Math.abs(dragDistance) > 5) {
      purposeDragRef.current.moved = true;
      event.preventDefault();
    }

    let nextScrollLeft = purposeDragRef.current.startScrollLeft - dragDistance * 1.25;

    if (nextScrollLeft < 0) {
      nextScrollLeft += resetPoint;
    }

    if (nextScrollLeft >= resetPoint) {
      nextScrollLeft -= resetPoint;
    }

    row.scrollLeft = nextScrollLeft;
  }

  function handlePurposePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const row = purposeRowRef.current;
    const shouldNavigate = !purposeDragRef.current.moved && purposeDragRef.current.pendingHref;
    const nextHref = purposeDragRef.current.pendingHref;

    purposeDragRef.current.active = false;
    purposeDragRef.current.pendingHref = "";
    setPurposeDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }

    if (shouldNavigate) {
      purposeDragRef.current.suppressClick = true;
      window.location.assign(nextHref);
    }
  }

  function stopPurposeDrag() {
    purposeDragRef.current.active = false;
    purposeDragRef.current.pendingHref = "";
    setPurposeDragging(false);
  }

  function handlePurposeCardClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (purposeDragRef.current.moved || purposeDragRef.current.suppressClick) {
      event.preventDefault();
      purposeDragRef.current.moved = false;
      purposeDragRef.current.suppressClick = false;
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  function goToPage(href: string) {
    setMobileMenuOpen(false);
    window.location.assign(href);
  }

  return (
    <main>
      <div className="top-strip">
        <a className="phone-link" href={phoneHref || "tel:+8801886589009"}>
          <span className="phone-dot" />
          {siteSettings.phoneNumber || "+880 1886-589009"}
        </a>
        <a href={phoneHref || "tel:+8801886589009"}>Showroom <ChevronRight size={14} /></a>
      </div>

      <header ref={headerRef} className={headerGlass ? "site-header glass" : "site-header"}>
        <button
          className="icon-button menu-button"
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src={siteSettings.websiteLogo || "/recon-logo.webp"} alt={siteSettings.siteName} width={178} height={55} />
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
          <button className="download-button" type="button" onClick={downloadStockList}>
            <Download size={17} />
            Download Stock List
          </button>
          <button className="search-button" type="button" aria-label="Search stock" onClick={() => setSearchOpen(true)}>
            <Search size={29} strokeWidth={1.35} />
          </button>
        </div>
      </header>

      <section className="hero" aria-label="Featured vehicles">
        <div className="hero-banner-track">
          {heroSlides.map((heroSlide, index) => (
            <div className={index === slide ? "hero-slide active" : "hero-slide"} key={heroSlide.title}>
              <Image
                className={`hero-image ${heroSlide.imageClass}`}
                src={heroSlide.image}
                alt={heroSlide.title}
                fill
                priority={index === 0}
                suppressHydrationWarning
                unoptimized
              />
            </div>
          ))}
        </div>
        <div className={`hero-title ${heroSlides[slide].textAnimation}`} key={heroSlides[slide].title}>
          {heroSlides[slide].title}
        </div>
        <div className="hero-controls">
          <button type="button" aria-label="Previous slide" onClick={previousSlide}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next slide" onClick={nextSlide}>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="verify-section" id="verify">
        <div className="verify-card">
          <div className="verify-copy">
            <h2>Verify any auction sheet</h2>
            <p>
              At Recon Imports, our expert Auction Sheet Verification service helps you verify your vehicle's true
              history, condition, and mileage before you buy.
            </p>
          </div>
          <a className="verify-link" href="/verify-auction-sheet">
            Get Verified <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <section className="purpose-section" id="purpose">
        <h2>{purposeSectionTitle}</h2>
        <div
          ref={purposeRowRef}
          className={purposeDragging ? "category-row dragging" : "category-row"}
          aria-label="Auto sliding vehicle body type list"
          onPointerDown={handlePurposePointerDown}
          onPointerMove={handlePurposePointerMove}
          onPointerUp={handlePurposePointerUp}
          onPointerCancel={handlePurposePointerUp}
          onMouseEnter={() => {
            purposeDragRef.current.hovered = true;
          }}
          onMouseLeave={() => {
            purposeDragRef.current.hovered = false;
            stopPurposeDrag();
          }}
        >
          <div className="category-track">
            {carouselCategories.map((category, index) => {
              const CategoryIcon = categoryIconByKey[category.iconKey || "car"] || Car;

              return (
                <a
                  className="category-card"
                  draggable={false}
                  href={category.href}
                  key={`${category.id}-${index}`}
                  onClick={(event) => handlePurposeCardClick(event, category.href)}
                >
                  <div>
                    <CategoryIcon size={34} />
                    <h3>{category.title}</h3>
                    <p>{category.copy}</p>
                  </div>
                  <Image
                    src={category.image}
                    alt={category.imageAlt || `${category.title} vehicle detail`}
                    width={430}
                    height={245}
                    draggable={false}
                    suppressHydrationWarning
                    unoptimized
                  />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="deals-section" id="deals">
        <div className="section-heading">
          <h1>Unbeatable Deals</h1>
          <p>Bringing you the best prices with a commitment to customer care.</p>
        </div>
        <a className="see-all-link" href="/car-stocks">
          See All
        </a>

        <div
          ref={stockRowRef}
          className={stockDragging ? "stock-row dragging" : "stock-row"}
          aria-label="Auto sliding vehicle stock list"
          onPointerDown={handleStockPointerDown}
          onPointerMove={handleStockPointerMove}
          onPointerUp={handleStockPointerUp}
          onPointerCancel={cancelStockDrag}
          onMouseEnter={() => {
            stockDragRef.current.hovered = true;
          }}
          onMouseLeave={() => {
            stockDragRef.current.hovered = false;
            stopStockDrag();
          }}
        >
          <div className="stock-track">
            {carouselStock.map((item, index) => (
              <a
                className="stock-card deals-stock-card"
                draggable={false}
                href={`/car-stocks/${item.id}`}
                key={`${item.id}-${index}`}
                onClick={(event) => handleDealCardClick(event, `/car-stocks/${item.id}`)}
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  width={340}
                  height={340}
                  draggable={false}
                  suppressHydrationWarning
                />
                <div className="stock-card-body">
                  <h2>{item.name}</h2>
                  <p>{item.year}</p>
                  <div className="stock-meta">
                    <span>{item.fuel}</span>
                    <span>{item.type}</span>
                    <span>{item.mileage}</span>
                  </div>
                  <strong>{formatPrice(item.price)}</strong>
                  <span className="stock-details-link">Show Details</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="preference-section" aria-labelledby="preference-heading">
        <h2 id="preference-heading">Choose per your preference</h2>
        <div className="preference-grid">
          {preferenceOptions.map((option) => (
            <a className="preference-card" href={option.href} key={option.title}>
              <Image src={option.image} alt={option.title} fill sizes="(max-width: 860px) 100vw, 33vw" />
              <span>{option.title}</span>
              <i aria-hidden="true">
                <ArrowUpRight size={24} />
              </i>
            </a>
          ))}
        </div>

        <div className="brand-logo-slider" aria-label="Available brands">
          <div className="brand-logo-track" style={{ transform: `translateX(-${brandSlide * 100}%)` }}>
            {brandLogoPages.map((brandPage, pageIndex) => (
              <div className="brand-logo-page" key={`brand-page-${pageIndex}`}>
                {brandPage.map((brand) => (
                  <a className="brand-logo-card" href={`/${brand.slug}`} key={brand.slug}>
                    {brand.logoUrl ? <img className="brand-logo-image" src={brand.logoUrl} alt={`${brand.name} logo`} /> : <span>{brand.name}</span>}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="brand-logo-dots" aria-hidden="true">
          {brandLogoPages.map((_, index) => (
            <span className={index === brandSlide ? "active" : ""} key={`brand-dot-${index}`} />
          ))}
        </div>

        <section className="consult-banner" aria-label="Connect to consult">
          <Image src="/hero-slide-1.webp" alt="" fill sizes="100vw" />
          <div className="consult-copy">
            <h2>Connect to Consult</h2>
            <p>
              Our expert sales team is here to assist you to choose your vehicle according to your necessity, choice and
              preference.
            </p>
            <a href={phoneHref || "tel:+8801886589009"}>Book An Appointment</a>
          </div>
        </section>
      </section>

      <Footer settings={siteSettings} />

      <a className="whatsapp" href={whatsappHref || "https://wa.me/8801886589009"} aria-label="Chat on WhatsApp">
        <MessageCircle size={28} />
      </a>

      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search inventory">
          <div className="search-modal">
            <button className="close-search" type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}>
              <X size={24} />
            </button>
            <h2>Search stock</h2>
            <label>
              <Search size={22} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by model, type, or year"
                suppressHydrationWarning
              />
            </label>
            <p>{filteredStock.length} vehicles match your current search.</p>
          </div>
        </div>
      )}
    </main>
  );
}
