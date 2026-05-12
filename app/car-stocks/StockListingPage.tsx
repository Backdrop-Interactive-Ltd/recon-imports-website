"use client";

import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useMemo, useState } from "react";

// Inventory data used by the car stocks grid and filter controls.
const inventory = [
  {
    id: "land-cruiser-lc300",
    name: "Land Cruiser LC300 ZX",
    year: "2022",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "23K km",
    price: 37900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/stock-noah-2023.webp",
  },
  {
    id: "bmw-x7-blue",
    name: "BMW X7",
    year: "2021",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "15K km",
    price: 27900000,
    brand: "BMW",
    body: "SUV",
    availability: "Available",
    image: "/cat-mpv.webp",
  },
  {
    id: "bmw-x7-black",
    name: "BMW X7 Xdrive40i M-Sport",
    year: "2022",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "15K km",
    price: 26900000,
    brand: "BMW",
    body: "SUV",
    availability: "Available",
    image: "/cat-crossover.webp",
  },
  {
    id: "range-rover-2020",
    name: "Range Rover Vogue Autobiography",
    year: "2020",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "5K Miles",
    price: 24900000,
    brand: "Range Rover",
    body: "SUV",
    availability: "Available",
    image: "/cat-wagon.webp",
  },
  {
    id: "range-rover-2019",
    name: "Range Rover Vogue Autobiography",
    year: "2019",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "14K km",
    price: 21900000,
    brand: "Range Rover",
    body: "SUV",
    availability: "Available",
    image: "/stock-axio.webp",
  },
  {
    id: "mercedes-s560e",
    name: "Mercedes-Benz S 560e",
    year: "2019",
    fuel: "Octane (H)",
    type: "Pre Owned",
    mileage: "11K m",
    price: 18900000,
    brand: "Mercedes-Benz",
    body: "Sedan",
    availability: "Available",
    image: "/stock-noah-black.webp",
  },
  {
    id: "land-cruiser-zx-v8",
    name: "Land Cruiser Zx-V8",
    year: "2015",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "71K km",
    price: 18900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/stock-noah-white.webp",
  },
  {
    id: "bmw-745le",
    name: "BMW 745Le",
    year: "2019",
    fuel: "Octane",
    type: "Pre Owned",
    mileage: "15K km",
    price: 18900000,
    brand: "BMW",
    body: "Sedan",
    availability: "Available",
    image: "/stock-noah-pearl.webp",
  },
  {
    id: "toyota-alphard",
    name: "Toyota Alphard",
    year: "2024",
    fuel: "Octane (H)",
    type: "Reconditioned",
    mileage: "8K km",
    price: 16900000,
    brand: "Toyota",
    body: "MPV",
    availability: "Available",
    image: "/stock-noah-2023.webp",
  },
  {
    id: "land-cruiser-vx-2016",
    name: "Land Cruiser Vx-V8",
    year: "2016",
    fuel: "Diesel",
    type: "Pre Owned",
    mileage: "41K km",
    price: 16900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/cat-suv.webp",
  },
  {
    id: "land-cruiser-vx-2015",
    name: "Land Cruiser Vx-V8",
    year: "2015",
    fuel: "Diesel",
    type: "Pre Owned",
    mileage: "74K km",
    price: 15900000,
    brand: "Toyota",
    body: "SUV",
    availability: "Available",
    image: "/cat-crossover.webp",
  },
  {
    id: "lexus-rx500h",
    name: "Lexus RX 500h Turbo",
    year: "2023",
    fuel: "Octane (H)",
    type: "Pre Owned",
    mileage: "22K km",
    price: 14900000,
    brand: "Lexus",
    body: "Crossover",
    availability: "Available",
    image: "/stock-axio.webp",
  },
];

function formatPrice(price: number) {
  return `BDT ${new Intl.NumberFormat("en-IN").format(price)}`;
}

// Creates a downloadable CSV from the current stock data.
function downloadStockList() {
  const rows = [
    ["Name", "Year", "Brand", "Body", "Fuel", "Type", "Mileage", "Price"],
    ...inventory.map((item) => [
      item.name,
      item.year,
      item.brand,
      item.body,
      item.fuel,
      item.type,
      item.mileage,
      formatPrice(item.price),
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "recon-imports-car-stocks.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const filterSections = [
  { title: "Types", key: "type", options: ["Brand New", "Reconditioned"] },
  { title: "Classification", key: "body", options: ["Crossover", "MPV", "Passenger Van", "SUV", "Sedan", "Wagon"] },
  { title: "Brand", key: "brand", options: ["Honda", "Mazda", "Nissan", "Toyota"] },
  { title: "Country Origin", key: "origin", options: ["Europe", "Japan"] },
  { title: "Grade", key: "grade", options: ["Grade 3.5", "Grade 4", "Grade 4.5", "Grade 5", "Grade 6", "Grade R", "Grade S"] },
  {
    title: "Location",
    key: "location",
    options: ["Chittagong Port", "In Transit", "Japan Port", "Mongla Port", "Tejgaon Showroom - Dhaka"],
  },
  {
    title: "Package",
    key: "package",
    options: [
      "E Force Package",
      "EX",
      "EX Masterpiece",
      "EX Push Start",
      "Executive Lounge",
      "FL LED",
      "GE Force Package",
      "GI Package",
      "GI Premium Package",
      "Hybrid EX",
      "Hybrid G 4WD",
      "LX Package",
      "S Touring",
      "SZ Package",
      "TX-L Package",
      "Z Leather",
      "Z Package",
      "e HEV Z",
    ],
  },
  {
    title: "Transmission",
    key: "transmission",
    options: ["Automatic", "CVT", "E-cvt", "Hybrid electric", "Manual", "Semi-automatic", "Tiptronic"],
  },
  { title: "Unlinked", key: "unlinked", options: ["G4WD", "Hybrid G", "LC250 VX", "Sold"] },
  { title: "Year", key: "year", options: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"] },
] as const;

type StockListingPageProps = {
  activePage: "car-stocks" | "pre-owned" | "reconditioned";
  introCopy?: string;
  title?: string;
  typeFilter?: "Pre Owned" | "Reconditioned";
};

export default function StockListingPage({
  activePage,
  introCopy = "Glance through the widest collection of reconditioned Japanese models and pre-owned imported units and choose according to your budget and quality preferences.",
  title = "Choose per your preference",
  typeFilter,
}: StockListingPageProps) {
  const [priceMinLakh, setPriceMinLakh] = useState(10);
  const [priceMaxLakh, setPriceMaxLakh] = useState(500);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [newsletter, setNewsletter] = useState("");

  const stockInventory = useMemo(() => {
    return typeFilter ? inventory.filter((car) => car.type === typeFilter) : inventory;
  }, [typeFilter]);

  const filteredCars = useMemo(() => {
    return stockInventory.filter((car) => {
      const minPrice = priceMinLakh * 100000;
      const maxPrice = priceMaxLakh * 100000;
      const selectedTypes = selectedFilters.type ?? [];
      const selectedBodies = selectedFilters.body ?? [];
      const selectedBrands = selectedFilters.brand ?? [];
      const selectedYears = selectedFilters.year ?? [];
      const matchesPrice = car.price >= minPrice && car.price <= maxPrice;
      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.some((selectedType) =>
          selectedType === "Brand New" ? car.type === "Pre Owned" : car.type === selectedType,
        );
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(car.brand);
      const matchesBody = selectedBodies.length === 0 || selectedBodies.includes(car.body);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(car.year);

      return matchesPrice && matchesType && matchesBrand && matchesBody && matchesYear;
    });
  }, [priceMaxLakh, priceMinLakh, selectedFilters, stockInventory]);

  function resetFilters() {
    setPriceMinLakh(10);
    setPriceMaxLakh(500);
    setSelectedFilters({});
  }

  function toggleSectionFilter(key: string, value: string) {
    setSelectedFilters((currentFilters) => {
      const currentValues = currentFilters[key] ?? [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value];

      return {
        ...currentFilters,
        [key]: nextValues,
      };
    });
  }

  return (
    <main className="cars-page">
      {/* Header: same navigation style used across stock and verification pages. */}
      <header className="cars-header">
        <a className="cars-logo" href="/">
          <img src="/recon-logo.webp" alt="Recon Imports" />
        </a>
        <nav aria-label="Cars page navigation">
          <a href="/">Home</a>
          <a className={activePage === "car-stocks" ? "active" : ""} href="/car-stocks">
            Car Stocks
          </a>
          <a className={activePage === "pre-owned" ? "active" : ""} href="/pre-owned">
            Pre-Owned
          </a>
          <a className={activePage === "reconditioned" ? "active" : ""} href="/reconditioned">
            Reconditioned
          </a>
          <a href="/verify-auction-sheet">Verify Auction Sheet</a>
        </nav>
        <button className="download-button cars-download" type="button" onClick={downloadStockList}>
          <Download size={17} />
          Download Stock List
        </button>
      </header>

      {/* Intro: short page heading and supporting copy above the inventory browser. */}
      <section className="cars-intro">
        <h1>{title}</h1>
        <p>{introCopy}</p>
      </section>

      {/* Inventory layout: filter sidebar on desktop, stacked filters on mobile. */}
      <section className="cars-layout">
        <aside className="cars-filter">
          <h2>Filters</h2>

          <div className="filter-price">
            <div className="filter-section-title">
              <span>Price Range</span>
              <ChevronDown size={16} />
            </div>
            <div className="filter-price-values">
              <span>~ BDT 10L</span>
              <span>5Cr+ ~</span>
            </div>
            <div className="price-slider" aria-label="Price range from BDT 10L to 5Cr">
              <input
                aria-label="Minimum price"
                max="500"
                min="10"
                onChange={(event) => setPriceMinLakh(Math.min(Number(event.target.value), priceMaxLakh - 10))}
                type="range"
                value={priceMinLakh}
              />
              <input
                aria-label="Maximum price"
                max="500"
                min="10"
                onChange={(event) => setPriceMaxLakh(Math.max(Number(event.target.value), priceMinLakh + 10))}
                type="range"
                value={priceMaxLakh}
              />
            </div>
          </div>

          {filterSections.map((section) => (
            <div className={`filter-accordion ${openFilter === section.key ? "is-open" : ""}`} key={section.key}>
              <button
                aria-expanded={openFilter === section.key}
                className="filter-summary"
                onClick={() => setOpenFilter((currentFilter) => (currentFilter === section.key ? null : section.key))}
                type="button"
              >
                <span>{section.title}</span>
                <ChevronDown size={16} />
              </button>
              <div className="filter-options" aria-hidden={openFilter !== section.key}>
                {section.options.map((option) => (
                  <label className="filter-check" key={option}>
                    <input
                      checked={(selectedFilters[section.key] ?? []).includes(option)}
                      onChange={() => toggleSectionFilter(section.key, option)}
                      tabIndex={openFilter === section.key ? 0 : -1}
                      type="checkbox"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button className="reset-filter" type="button" onClick={resetFilters}>
            Reset All Filters
          </button>
        </aside>

        <div className="cars-content">
          {/* Feature banner: quick jump into the stock grid. */}
          <a className="cars-feature" href="#stocks">
            <span>
              <span>Looking for</span>
              <strong>Reconditioned Unit?</strong>
            </span>
            <ArrowUpRight size={25} />
          </a>

          {/* Stock grid: cards update when search, price, brand, body, or availability filters change. */}
          <div className="cars-grid" id="stocks">
            {filteredCars.map((car) => (
              <article className="stock-card" key={car.id}>
                <img src={car.image} alt={car.name} loading="eager" decoding="sync" />
                <div className="stock-card-body">
                  <h2>{car.name}</h2>
                  <p>{car.year}</p>
                  <div className="stock-meta">
                    <span>{car.fuel}</span>
                    <span>{car.type}</span>
                    <span>{car.mileage}</span>
                  </div>
                  <strong>{formatPrice(car.price)}</strong>
                  <a className="stock-details-link" href={`/car-stocks/${car.id}`}>
                    Show Details
                  </a>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination UI: visual page controls for the current stock listing design. */}
          <div className="cars-pagination">
            <button type="button">
              <ChevronLeft size={17} />
              Previous
            </button>
            {[1, 2, 3, 4, 5].map((page) => (
              <button className={page === 1 ? "active" : ""} type="button" key={page}>
                {page}
              </button>
            ))}
            <button type="button">
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer: dark wave footer with current site links, newsletter signup, and social channels. */}
      <footer className="footer cars-footer">
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
    </main>
  );
}
