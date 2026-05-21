import Footer from "../components/Footer";
import { getSiteSettings } from "../../lib/siteSettings";
import SendRequirementsForm from "./SendRequirementsForm";

export const dynamic = "force-dynamic";

export default async function SendRequirementsPage() {
  const siteSettings = await getSiteSettings();

  return (
    <main className="send-requirements-page">
      <header className="cars-header send-requirements-header">
        <a className="cars-logo" href="/">
          <img
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={siteSettings.siteName}
            width={178}
            height={55}
            suppressHydrationWarning
          />
        </a>
        <nav aria-label="Send requirements navigation">
          <a href="/">Home</a>
          <a href="/brand-new">Brand New</a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/pre-owned">Pre-Owned</a>
          <a href="/pre-order">Pre-Order</a>
          <a className="active" href="/send-requirements">
            Send Requirements
          </a>
        </nav>
      </header>

      <section className="sell-car-section" aria-label="Send car requirements">
        <div className="sell-car-copy">
          <h1>
            Looking For
            <span>Your Perfect Car?</span>
          </h1>
          <p>
            Finding your ideal vehicle has never been this effortless. Simply send us your requirements along with your
            budget, and our team will find the best vehicle options tailored to your needs with complete care and
            transparency— no stress, no confusion, just expert guidance every step of the way. From sourcing to
            verification, we make the entire process smooth, secure, and tailored to your needs so you can buy with
            complete confidence.
          </p>
        </div>

        <SendRequirementsForm />
      </section>

      <Footer className="send-requirements-footer" settings={siteSettings} />
    </main>
  );
}
