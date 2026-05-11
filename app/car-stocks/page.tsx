"use client";

import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
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

export default function CarStocksPage() {
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState("All Price Range");
  const [brand, setBrand] = useState("All Brands");
  const [body, setBody] = useState("All Body style");
  const [availability, setAvailability] = useState("Available");
  const [newsletter, setNewsletter] = useState("");

  const filteredCars = useMemo(() => {
    return inventory.filter((car) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || `${car.name} ${car.brand} ${car.year}`.toLowerCase().includes(query);
      const matchesBrand = brand === "All Brands" || car.brand === brand;
      const matchesBody = body === "All Body style" || car.body === body;
      const matchesAvailability = availability === "All Availability" || car.availability === availability;
      const matchesPrice =
        priceRange === "All Price Range" ||
        (priceRange === "Under BDT 1.8Cr" && car.price < 18000000) ||
        (priceRange === "BDT 1.8Cr - 2.5Cr" && car.price >= 18000000 && car.price <= 25000000) ||
        (priceRange === "Above BDT 2.5Cr" && car.price > 25000000);

      return matchesSearch && matchesBrand && matchesBody && matchesAvailability && matchesPrice;
    });
  }, [availability, body, brand, priceRange, search]);

  function resetFilters() {
    setSearch("");
    setPriceRange("All Price Range");
    setBrand("All Brands");
    setBody("All Body style");
    setAvailability("Available");
  }

  return (
    <main className="cars-page">
      {/* Header: same navigation style used across stock and verification pages. */}
      <header className="cars-header">
        <a className="cars-logo" href="/">
          <img src="/recon-logo.webp" alt="Recon Imports" />
        </a>
        <nav aria-label="Cars page navigation">
          <a className="active" href="/car-stocks">
            Car Stocks
          </a>
          <a href="/">Home</a>
          <a href="/#deals">Pre-Owned</a>
          <a href="/verify-auction-sheet">Verify Auction Sheet</a>
        </nav>
        <button className="download-button cars-download" type="button" onClick={downloadStockList}>
          <Download size={17} />
          Download Stock List
        </button>
      </header>

      {/* Intro: short page heading and supporting copy above the inventory browser. */}
      <section className="cars-intro">
        <h1>Choose per your preference</h1>
        <p>
          Glance through the widest collection of reconditioned Japanese models and pre-owned imported units and choose
          according to your budget and quality preferences.
        </p>
      </section>

      {/* Inventory layout: filter sidebar on desktop, stacked filters on mobile. */}
      <section className="cars-layout">
        <aside className="cars-filter">
          <label className="cars-search">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type Here" />
            <span>Search</span>
          </label>

          <h2>Filter</h2>

          <label>
            Price Range
            <select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}>
              <option>All Price Range</option>
              <option>Under BDT 1.8Cr</option>
              <option>BDT 1.8Cr - 2.5Cr</option>
              <option>Above BDT 2.5Cr</option>
            </select>
            <ChevronDown size={18} />
          </label>

          <label>
            Brand
            <select value={brand} onChange={(event) => setBrand(event.target.value)}>
              <option>All Brands</option>
              <option>Toyota</option>
              <option>BMW</option>
              <option>Range Rover</option>
              <option>Mercedes-Benz</option>
              <option>Lexus</option>
            </select>
            <ChevronDown size={18} />
          </label>

          <label>
            Model Generation
            <select defaultValue="All Models">
              <option>All Models</option>
              <option>2015 - 2019</option>
              <option>2020 - 2024</option>
            </select>
            <ChevronDown size={18} />
          </label>

          <label>
            Availability
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option>Available</option>
              <option>All Availability</option>
            </select>
            <ChevronDown size={18} />
          </label>

          <label>
            Body Style
            <select value={body} onChange={(event) => setBody(event.target.value)}>
              <option>All Body style</option>
              <option>SUV</option>
              <option>Sedan</option>
              <option>MPV</option>
              <option>Crossover</option>
            </select>
            <ChevronDown size={18} />
          </label>

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
                  <button type="button">Show Details</button>
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
