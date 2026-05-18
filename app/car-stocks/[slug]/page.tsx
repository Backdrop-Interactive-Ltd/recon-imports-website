import { Download, MessageCircle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import Footer from "../../components/Footer";
import { getPublicCarDetail, getPublicCarStaticParams } from "../data";
import { formatPrice } from "../inventory";
import ShareButton from "./ShareButton";
import SuggestedCarousel from "./SuggestedCarousel";
import { getPhoneHref, getSiteSettings, getWhatsAppHref } from "../../../lib/siteSettings";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getPublicCarStaticParams();
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [detail, siteSettings] = await Promise.all([getPublicCarDetail(slug), getSiteSettings()]);

  if (!detail) {
    notFound();
  }

  const { product, suggestedItems } = detail;
  const phoneHref = getPhoneHref(siteSettings.phoneNumber) || "tel:+8801886589009";
  const whatsappHref = getWhatsAppHref(siteSettings.whatsappNumber) || "https://wa.me/8801886589009";
  const specs = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["Reg. Year", product.regYear],
    ["Mileage", product.detailMileage],
    ["Engine (CC)", product.engine],
    ["Transmission", product.transmission],
    ["Fuel Type", product.detailFuel],
    ["Drive Type", product.drive],
    ["Wheel", product.wheel],
    ["Exterior", product.exterior],
    ["Body Style", product.detailBody],
  ];
  return (
    <main className="product-page">
      <header className="cars-header product-header">
        <a className="cars-logo" href="/">
          <img src={siteSettings.websiteLogo || "/recon-logo.webp"} alt={siteSettings.siteName} />
        </a>
        <nav aria-label="Product page navigation">
          <a href="/">Home</a>
          <a className="active" href="/car-stocks">
            Car Stocks
          </a>
          <a href="/reconditioned">Reconditioned</a>
          <a href="/ev">EVS</a>
          <a href="/pre-owned">Pre-Owner</a>
          <a href="/pre-order">Pre-Order</a>
          <a href="/send-requirements">Send Requirements</a>
        </nav>
        <a className="download-button cars-download" href="/car-stocks">
          <Download size={17} />
          Download Stock List
        </a>
      </header>

      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="/car-stocks">Car Stocks</a>
        <span>/</span>
        <strong>{product.name}</strong>
      </nav>

      <section className="product-gallery" aria-label={`${product.name} gallery`}>
        <img className="product-gallery-main" src={product.hero} alt={product.name} />
        <div className="product-gallery-grid">
          {product.gallery.slice(1).map((image, index) => (
            <img src={image} alt={`${product.name} view ${index + 2}`} key={`${image}-${index}`} />
          ))}
        </div>
      </section>

      <section className="product-heading-row">
        <h1>{product.name}</h1>
        <ShareButton />
      </section>

      <section className="product-detail-layout">
        <div className="product-main-column">
          <div className="product-spec-card">
            {specs.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <article className="product-description">
            <h2>Description</h2>
            <p>{product.description}</p>
            <h3>Features & Options:</h3>
            <ul>
              {product.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <h3>Safety Features:</h3>
            <ul>
              {product.safetyFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

          <div className="product-video">
            <img src={product.videoImage} alt={`${product.name} video preview`} />
            <span>Play</span>
          </div>
        </div>

        <aside className="product-contact-card">
          <div className="product-price">
            <strong>{formatPrice(product.price)}</strong>
            <span>*Price may be slightly negotiable</span>
          </div>
          <div className="product-help">
            <h2>Need help making a choice?</h2>
            <p>
              Our expert sales team is here to assist you to choose your vehicle according to your necessity, choice and
              preference.
            </p>
          </div>
          <a className="product-action light" href={phoneHref}>
            <Phone size={16} />
            Call Us
          </a>
          <a className="product-action pale" href={whatsappHref} target="_blank" rel="noreferrer">
            <MessageCircle size={16} />
            Text Us on WhatsApp
          </a>
          <a className="product-action light" href="/send-requirements">
            Get a Quote
          </a>
          <a className="product-appointment" href="https://calendly.com/reconimportsltd/30min" target="_blank" rel="noreferrer">
            Book an Appointment
          </a>
        </aside>
      </section>

      <section className="product-suggested">
        <h2>Suggested for you</h2>
        <SuggestedCarousel items={suggestedItems} />
      </section>

      <Footer className="product-footer" settings={siteSettings} />
    </main>
  );
}
