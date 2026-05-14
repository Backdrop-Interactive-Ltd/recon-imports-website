import Footer from "../components/Footer";
import { getSiteSettings } from "../../lib/siteSettings";
import SellYourCarForm from "./SellYourCarForm";

export const dynamic = "force-dynamic";

export default async function SellYourCarPage() {
  const siteSettings = await getSiteSettings();

  return (
    <main className="send-requirements-page">
      <header className="cars-header send-requirements-header">
        <a className="cars-logo" href="/">
          <img src={siteSettings.websiteLogo || "/recon-logo.webp"} alt={siteSettings.siteName} />
        </a>
        <nav aria-label="Sell your car navigation">
          <a href="/">Home</a>
          <a href="/car-stocks">Car Stocks</a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/ev">EVS</a>
          <a href="/pre-owned">Pre-Owner</a>
          <a href="/pre-order">Pre-Order</a>
          <a href="/send-requirements">Send Requirements</a>
        </nav>
      </header>

      <section className="sell-car-section" aria-label="Sell your car form">
        <div className="sell-car-copy">
          <h1>
            Got A Car
            <span>You Need To Sell?</span>
          </h1>
          <p>
            Selling off your vehicle has never been this effortless. From the moment you arrive, every step is handled
            with care-no stress, no pressure, just honest guidance and clarity. We take care of the paperwork and offer
            a fair value, ensuring everything feels effortless and secure. It's a simple, safe way to pass your car into
            good hands, and walk away with confidence and peace of mind.
          </p>
        </div>

        <SellYourCarForm />
      </section>

      <Footer className="send-requirements-footer" settings={siteSettings} />
    </main>
  );
}
