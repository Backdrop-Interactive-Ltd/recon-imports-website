"use client";

import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { getCarPublicPath } from "../../lib/carPublicRoutes";
import { formatPrice } from "../../lib/formatPrice";
import type { PublicBrandOption } from "./data";
import type { CarInventoryItem } from "./inventory";

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

type StockInventoryBrowserProps = {
  availableBrands: PublicBrandOption[];
  inventoryItems: CarInventoryItem[];
};

function StockCard({ car }: { car: CarInventoryItem }) {
  return (
    <article className="stock-card">
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
  );
}

export default function StockInventoryBrowser({ availableBrands, inventoryItems }: StockInventoryBrowserProps) {
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

  const filteredCars = useMemo(() => {
    return inventoryItems.filter((car) => {
      const minPrice = priceMinLakh * 100000;
      const maxPrice = priceMaxLakh * 100000;
      const selectedTypes = selectedFilters.type ?? [];
      const selectedBodies = selectedFilters.body ?? [];
      const selectedBrands = selectedFilters.brand ?? [];
      const selectedYears = selectedFilters.year ?? [];
      const matchesPrice = car.price >= minPrice && car.price <= maxPrice;
      const matchesType = selectedTypes.length === 0 || selectedTypes.some((selectedType) => car.type === selectedType);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(car.brand);
      const matchesBody = selectedBodies.length === 0 || selectedBodies.includes(car.body);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(car.year);

      return matchesPrice && matchesType && matchesBrand && matchesBody && matchesYear;
    });
  }, [inventoryItems, priceMaxLakh, priceMinLakh, selectedFilters]);

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
        <a className="cars-feature" href="#stocks">
          <span>
            <span>Looking for</span>
            <strong>Reconditioned Unit?</strong>
          </span>
          <ArrowUpRight size={25} />
        </a>

        <div className="cars-grid" id="stocks">
          {filteredCars.length > 0 ? (
            filteredCars.map((car) => <StockCard car={car} key={car.id} />)
          ) : (
            <p className="cars-empty">No vehicles found for these filters.</p>
          )}
        </div>

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
  );
}
