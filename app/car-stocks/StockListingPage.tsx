"use client";

import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import Footer from "../components/Footer";
import { brandOptions as fallbackBrandOptions } from "./brands";
import { formatPrice, inventory as fallbackInventory, type CarInventoryItem } from "./inventory";
import type { PublicBrandOption } from "./data";
import { getCarPublicPath } from "../../lib/carPublicRoutes";
import { fallbackSiteSettings, type PublicSiteSettings } from "../../lib/siteSettingsConfig";

const staticFilterSections = [
  { title: "Types", key: "type", options: ["Brand New", "Pre Owned", "Pre Order", "Reconditioned"] },
  {
    title: "Classification",
    key: "body",
    options: ["Sedan", "Hatchback", "SUV", "Crossover", "MPV", "Passenger Van", "Wagon"],
  },
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

export type StockListingPageProps = {
  activePage: "brand-new" | "pre-owned" | "pre-order" | "reconditioned" | "send-requirements";
  availableBrands?: PublicBrandOption[];
  bodyFilter?: "Sedan" | "Hatchback" | "SUV" | "Crossover" | "MPV" | "Passenger Van";
  brandFilter?: string;
  inventoryItems?: CarInventoryItem[];
  introCopy?: string;
  siteSettings?: PublicSiteSettings;
  title?: string;
  typeFilter?: "Brand New" | "Pre Owned" | "Pre Order" | "Reconditioned";
};

export default function StockListingPage({
  activePage,
  availableBrands = [...fallbackBrandOptions],
  bodyFilter,
  brandFilter,
  inventoryItems = fallbackInventory,
  introCopy = "Glance through selected vehicles and choose according to your budget and quality preferences.",
  siteSettings = fallbackSiteSettings,
  title = "Choose per your preference",
  typeFilter,
}: StockListingPageProps) {
  const [priceMinLakh, setPriceMinLakh] = useState(10);
  const [priceMaxLakh, setPriceMaxLakh] = useState(500);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const filterSections = useMemo(
    () => [
      staticFilterSections[0],
      staticFilterSections[1],
      { title: "Car Brands", key: "brand", options: availableBrands.map((brand) => brand.name) },
      ...staticFilterSections.slice(2),
    ],
    [availableBrands],
  );

  const stockInventory = useMemo(() => {
    return inventoryItems.filter((car) => {
      const matchesBody = !bodyFilter || car.body === bodyFilter;
      const matchesBrand = !brandFilter || car.brand === brandFilter;
      const matchesType = !typeFilter || car.type === typeFilter;

      return matchesBody && matchesBrand && matchesType;
    });
  }, [bodyFilter, brandFilter, inventoryItems, typeFilter]);

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
        selectedTypes.some((selectedType) => car.type === selectedType);
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
          <img
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={siteSettings.siteName}
            width={178}
            height={55}
            suppressHydrationWarning
          />
        </a>
        <nav aria-label="Cars page navigation">
          <a href="/">Home</a>
          <a className={activePage === "brand-new" ? "active" : ""} href="/brand-new">
            Brand New
          </a>
          <a className={activePage === "reconditioned" ? "active" : ""} href="/reconditioned">
            Reconditioned
          </a>
          <a className={activePage === "pre-owned" ? "active" : ""} href="/pre-owned">
            Pre-Owned
          </a>
          <a className={activePage === "pre-order" ? "active" : ""} href="/pre-order">
            Pre-Order
          </a>
          <a className={activePage === "send-requirements" ? "active" : ""} href="/send-requirements">
            Send Requirements
          </a>
        </nav>
        <a className="download-button cars-download" href="/stock-list.pdf" download>
          <Download size={17} />
          Download Stock List
        </a>
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
            {filteredCars.length > 0 ? (
              filteredCars.map((car) => (
                <article className="stock-card" key={car.id}>
                  {car.saleStatus === "Sold" ? <span className="stock-sale-badge">Sold</span> : null}
                  <Image
                    src={car.image}
                    alt={car.name}
                    width={600}
                    height={600}
                    loading="lazy"
                    sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw"
                    suppressHydrationWarning
                  />
                  <div className="stock-card-body">
                    <h2>{car.name}</h2>
                    <p>{car.year}</p>
                    <div className="stock-meta">
                      <span>{car.fuel}</span>
                      <span>{car.type}</span>
                      <span>{car.mileage}</span>
                    </div>
                    <strong>{formatPrice(car.price)}</strong>
                    <a className="stock-details-link" href={car.publicPath ?? getCarPublicPath({ id: car.id, type: car.type })}>
                      Show Details
                    </a>
                  </div>
                </article>
              ))
            ) : (
              <p className="cars-empty">No vehicles found for these filters.</p>
            )}
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

      <Footer className="cars-footer" settings={siteSettings} />
    </main>
  );
}
