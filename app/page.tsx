"use client";

import Image from "next/image";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Menu,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type NavItem =
  | { label: string; href: string; target?: never }
  | { label: string; target: string; href?: never };

// Main homepage navigation. Route links open full pages, target links scroll inside the homepage.
const navItems: NavItem[] = [
  { label: "Car Stocks", href: "/car-stocks" },
  { label: "Pre-Owned", target: "deals" },
  { label: "Reconditioned", target: "purpose" },
  { label: "Verify Auction Sheet", href: "/verify-auction-sheet" },
];

const heroSlides = [
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

const stock = [
  {
    id: "noah-white-2021",
    brand: "Toyota",
    name: "Toyota Noah",
    year: "2021 MPV",
    price: 37,
    image: "/stock-noah-white.webp",
  },
  {
    id: "noah-black-2021",
    brand: "Toyota",
    name: "Toyota Noah",
    year: "2021 MPV",
    price: 36.5,
    image: "/stock-noah-black.webp",
  },
  {
    id: "noah-pearl-2021",
    brand: "Toyota",
    name: "Toyota Noah",
    year: "2021 MPV",
    price: 37,
    image: "/stock-noah-pearl.webp",
  },
  {
    id: "noah-2023",
    brand: "Toyota",
    name: "Toyota Noah",
    year: "2023 MPV",
    price: 54,
    image: "/stock-noah-2023.webp",
  },
  {
    id: "axio-2021",
    brand: "Toyota",
    name: "Toyota Axio",
    year: "2021 Sedan",
    price: 29,
    image: "/stock-axio.webp",
  },
  {
    id: "voxy-2021",
    brand: "Toyota",
    name: "Toyota Voxy",
    year: "2021 MPV",
    price: 39,
    image: "/stock-noah-black.webp",
  },
  {
    id: "esquire-2020",
    brand: "Toyota",
    name: "Toyota Esquire",
    year: "2020 MPV",
    price: 35,
    image: "/stock-noah-pearl.webp",
  },
  {
    id: "harrier-2021",
    brand: "Toyota",
    name: "Toyota Harrier",
    year: "2021 SUV",
    price: 51,
    image: "/stock-noah-2023.webp",
  },
  {
    id: "allion-2020",
    brand: "Toyota",
    name: "Toyota Allion",
    year: "2020 Sedan",
    price: 31,
    image: "/stock-axio.webp",
  },
  {
    id: "premio-2021",
    brand: "Toyota",
    name: "Toyota Premio",
    year: "2021 Sedan",
    price: 34,
    image: "/stock-noah-white.webp",
  },
];

const categories = [
  {
    title: "SUV",
    copy: "Spacious and versatile for power and adventure.",
    image: "/cat-suv.webp",
  },
  {
    title: "MPV",
    copy: "Multi-purpose vehicles designed for maximum seating and flexibility.",
    image: "/cat-mpv.webp",
  },
  {
    title: "Crossover",
    copy: "Blending sedan agility with the versatile, elevated stance of an SUV.",
    image: "/cat-crossover.webp",
  },
  {
    title: "Wagon",
    copy: "Practical cars with extra room for family and cargo.",
    image: "/cat-wagon.webp",
  },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState(54);
  const [auctionVin, setAuctionVin] = useState("");
  const [newsletter, setNewsletter] = useState("");
  const [stockDragging, setStockDragging] = useState(false);
  const [headerGlass, setHeaderGlass] = useState(false);
  const stockRowRef = useRef<HTMLDivElement>(null);
  const stockDragRef = useRef({
    active: false,
    hovered: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const filteredStock = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return stock.filter((item) => {
      const matchesBudget = item.price <= budget;
      const matchesQuery =
        !normalizedQuery ||
        `${item.brand} ${item.name} ${item.year}`.toLowerCase().includes(normalizedQuery);

      return matchesBudget && matchesQuery;
    });
  }, [budget, query]);
  const carouselStock = [...filteredStock, ...filteredStock];

  useEffect(() => {
    let animationFrame = 0;

    function animateStockRow() {
      const row = stockRowRef.current;

      if (row && filteredStock.length > 0 && !stockDragRef.current.active && !stockDragRef.current.hovered) {
        const resetPoint = row.scrollWidth / 2;
        row.scrollLeft += 0.65;

        if (row.scrollLeft >= resetPoint) {
          row.scrollLeft -= resetPoint;
        }
      }

      animationFrame = requestAnimationFrame(animateStockRow);
    }

    animationFrame = requestAnimationFrame(animateStockRow);

    return () => cancelAnimationFrame(animationFrame);
  }, [filteredStock.length]);

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
  }, []);

  useEffect(() => {
    function updateHeaderGlass() {
      setHeaderGlass(window.scrollY > 24);
    }

    updateHeaderGlass();
    window.addEventListener("scroll", updateHeaderGlass, { passive: true });

    return () => window.removeEventListener("scroll", updateHeaderGlass);
  }, []);

  function nextSlide() {
    setSlide((current) => (current + 1) % heroSlides.length);
  }

  function previousSlide() {
    setSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  }

  function downloadStockList() {
    const rows = [
      ["Brand", "Model", "Year Type", "Price"],
      ...stock.map((item) => [item.brand, item.name, item.year, `BDT ${item.price} Lacs`]),
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

    event.preventDefault();
    stockDragRef.current.active = true;
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
    event.preventDefault();
    const dragDistance = event.clientX - stockDragRef.current.startX;
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

    stockDragRef.current.active = false;
    setStockDragging(false);

    if (row?.hasPointerCapture(event.pointerId)) {
      row.releasePointerCapture(event.pointerId);
    }
  }

  function stopStockDrag() {
    stockDragRef.current.active = false;
    setStockDragging(false);
  }

  return (
    <main>
      <div className="top-strip">
        <a className="phone-link" href="tel:+8801886589009">
          <span className="phone-dot" />
          +880 1886-589009
        </a>
        <a href="/verify-auction-sheet">Get any auction sheet verified</a>
        <a href="tel:+8801886589009">Showroom <ChevronRight size={14} /></a>
      </div>

      <header className={headerGlass ? "site-header glass" : "site-header"}>
        <button
          className="icon-button menu-button"
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Image src="/recon-logo.webp" alt="Recon Imports" width={178} height={55} priority suppressHydrationWarning />
        </button>

        <nav className={mobileMenuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.href) {
                  window.location.href = item.href;
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

      <section className="deals-section" id="deals">
        <div className="section-heading">
          <h1>Unbeatable Deals</h1>
          <p>Bringing you the best prices with a commitment to customer care.</p>
        </div>

        <div
          ref={stockRowRef}
          className={stockDragging ? "stock-row dragging" : "stock-row"}
          aria-label="Auto sliding vehicle stock list"
          onPointerDown={handleStockPointerDown}
          onPointerMove={handleStockPointerMove}
          onPointerUp={handleStockPointerUp}
          onPointerCancel={handleStockPointerUp}
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
              <article className="vehicle-card" key={`${item.id}-${index}`}>
                <Image
                  src={item.image}
                  alt={item.name}
                  width={340}
                  height={340}
                  draggable={false}
                  suppressHydrationWarning
                />
                <div className="vehicle-meta">
                  <span className="maker">
                    <Car size={18} /> {item.brand}
                  </span>
                  <h2>{item.name}</h2>
                  <span className="accent-line" />
                  <p>{item.year}</p>
                  <strong>BDT {item.price} Lacs</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="budget-panel">
          <div>
            <h2>Looking in a budget?</h2>
            <p>Set your price range to discover available options.</p>
          </div>
          <label className="range-control">
            <span>~ BDT 10L</span>
            <input
              type="range"
              min="10"
              max="54"
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
            <span>{budget}L</span>
          </label>
          <button type="button" onClick={() => setSearchOpen(true)}>
            <Search size={17} />
            Search
          </button>
        </div>
      </section>

      <section className="purpose-section" id="purpose">
        <h2>Explore vehicles that suit your purpose</h2>
        <div className="category-row">
          {categories.map((category) => (
            <article className="category-card" key={category.title}>
              <div>
                <Car size={34} />
                <h3>{category.title}</h3>
                <p>{category.copy}</p>
              </div>
              <Image
                src={category.image}
                alt={`${category.title} vehicle detail`}
                width={430}
                height={245}
                suppressHydrationWarning
              />
            </article>
          ))}
        </div>
      </section>

      <section className="verify-section" id="verify">
        <div className="verify-card">
          <div className="verify-copy">
            <h2>Verify any auction sheet</h2>
            <p>
              At Reliant Motors, we provide authentic auction sheet verification to ensure you are confident with your
              purchase.
            </p>
            <ul>
              <li>Enter Chassis Number or VIN</li>
              <li>Confirm Order</li>
              <li>Receive Verified Report</li>
            </ul>
            <div className="vin-form">
              <input
                value={auctionVin}
                onChange={(event) => setAuctionVin(event.target.value)}
                placeholder="Chassis number or VIN"
                aria-label="Chassis number or VIN"
              />
              <button type="button" onClick={() => (window.location.href = "/verify-auction-sheet")}>
                Get Verified <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div className="auction-sheet" aria-hidden="true">
            <div className="sheet-grid" />
            <CheckCircle2 size={70} />
          </div>
        </div>
      </section>

      {/* Footer: dark wave footer with current site links, newsletter signup, and social channels. */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-column">
            <h3>Vehicles</h3>
            <button type="button">Sedan</button>
            <button type="button">SUV</button>
            <button type="button">Crossover</button>
            <button type="button">Wagon</button>
          </div>
          <div className="footer-column">
            <h3>Support</h3>
            <button type="button">Contact us</button>
            <button type="button">FAQs & support</button>
            <button type="button">Terms & conditions</button>
            <button type="button">After-sales</button>
          </div>
          <div className="footer-column">
            <h3>Reliant Motors</h3>
            <button type="button">About us</button>
            <a href="/car-stocks">Car Stocks</a>
            <a href="/verify-auction-sheet">Verify Auction Sheet</a>
          </div>
          <div className="footer-newsletter">
            <h3>Stay updated with Reliant Motors</h3>
            <label>
              <input
                value={newsletter}
                onChange={(event) => setNewsletter(event.target.value)}
                placeholder="Your Email Address"
                type="email"
              />
              <button type="button">Subscribe</button>
            </label>
            <div className="social-links" aria-label="Social links">
              <a href="https://www.instagram.com/" aria-label="Instagram" target="_blank" rel="noreferrer">IG</a>
              <a href="https://www.facebook.com/" aria-label="Facebook" target="_blank" rel="noreferrer">FB</a>
              <a href="https://www.youtube.com/" aria-label="YouTube" target="_blank" rel="noreferrer">YT</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <strong>
            &copy; 2026 Reliant Motors. All Rights Reserved by{" "}
            <a className="footer-credit" href="https://backdropinteractive.com/" target="_blank" rel="noreferrer">
              @Backdrop Interactive
            </a>
          </strong>
          <nav aria-label="Footer legal links">
            <button type="button">Terms of Service</button>
            <button type="button">Privacy Policy</button>
            <button type="button">Terms & conditions</button>
          </nav>
        </div>
      </footer>

      <a className="whatsapp" href="https://wa.me/8801886589009" aria-label="Chat on WhatsApp">
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
              />
            </label>
            <p>{filteredStock.length} vehicles match your current search.</p>
          </div>
        </div>
      )}
    </main>
  );
}
