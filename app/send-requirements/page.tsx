import Footer from "../components/Footer";
import JsonLd from "../components/JsonLd";
import PublicLogoImage from "../components/PublicLogoImage";
import { getSiteSettings } from "../../lib/siteSettings";
import { createBreadcrumbJsonLd, createPublicMetadata } from "../../lib/seo";
import SendRequirementsForm from "./SendRequirementsForm";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  description:
    "Tell Recon Imports your preferred car model, budget, features, and requirements. We help you find the right Japanese car in Bangladesh.",
  path: "/send-requirements",
  title: "Send Your Car Requirements | Recon Imports Bangladesh",
});

export default async function SendRequirementsPage() {
  const siteSettings = await getSiteSettings();

  return (
    <main className="send-requirements-page">
      <JsonLd
        data={createBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Send Requirements", path: "/send-requirements" }])}
      />
      <header className="cars-header send-requirements-header">
        <a className="cars-logo" href="/">
          <PublicLogoImage
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={`${siteSettings.siteName || "Recon Imports"} logo`}
            width={178}
            height={55}
            sizes="178px"
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
