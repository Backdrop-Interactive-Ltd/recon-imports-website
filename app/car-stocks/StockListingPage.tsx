import { Download } from "lucide-react";
import Footer from "../components/Footer";
import PublicLogoImage from "../components/PublicLogoImage";
import { fallbackSiteSettings, type PublicSiteSettings } from "../../lib/siteSettingsConfig";
import type { PublicBrandOption } from "./data";
import type { CarInventoryItem } from "./inventory";
import StockInventoryBrowser from "./StockInventoryBrowser";

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
  availableBrands = [],
  inventoryItems = [],
  introCopy = "Glance through selected vehicles and choose according to your budget and quality preferences.",
  siteSettings = fallbackSiteSettings,
  title = "Choose per your preference",
}: StockListingPageProps) {
  return (
    <main className="cars-page">
      <header className="cars-header">
        <a className="cars-logo" href="/">
          <PublicLogoImage
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={siteSettings.siteName}
            width={178}
            height={55}
            loading="eager"
            priority
            sizes="178px"
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

      <section className="cars-intro">
        <h1>{title}</h1>
        <p>{introCopy}</p>
      </section>

      <StockInventoryBrowser availableBrands={availableBrands} inventoryItems={inventoryItems} />

      <Footer className="cars-footer" settings={siteSettings} />
    </main>
  );
}
