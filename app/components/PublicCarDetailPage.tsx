import { Download, MessageCircle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { getCarPublicPath } from "../../lib/carPublicRoutes";
import { getPhoneHref, getSiteSettings, getWhatsAppHref } from "../../lib/siteSettings";
import { getPublicCarDetail } from "../car-stocks/data";
import { formatPrice } from "../car-stocks/inventory";
import ShareButton from "../car-stocks/[slug]/ShareButton";
import SuggestedCarousel from "../car-stocks/[slug]/SuggestedCarousel";
import Footer from "./Footer";
import ProductGallery from "./ProductGallery";
import ProductVideo from "./ProductVideo";

type ProductSection = {
  href: "/brand-new" | "/reconditioned" | "/pre-owned" | "/pre-order";
  label: string;
};

type PublicCarDetailPageProps = {
  params: Promise<{ slug: string }>;
  section: ProductSection;
};

export default async function PublicCarDetailPage({ params, section }: PublicCarDetailPageProps) {
  const { slug } = await params;
  const [detail, siteSettings] = await Promise.all([getPublicCarDetail(slug), getSiteSettings()]);

  if (!detail) {
    notFound();
  }

  const { product, suggestedItems } = detail;
  const productPath = product.publicPath ?? getCarPublicPath({ id: product.id, type: product.type });

  if (productPath !== `${section.href}/${slug}`) {
    notFound();
  }

  const phoneHref = getPhoneHref(siteSettings.phoneNumber) || "tel:+8801886589009";
  const whatsappHref = getWhatsAppHref(siteSettings.whatsappNumber) || "https://wa.me/8801886589009";
  const specs = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["Reg. Year", product.regYear],
    ["Mileage", product.detailMileage],
    ["Chassis Number", product.chassisNumber || "N/A"],
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
          <img
            src={siteSettings.websiteLogo || "/recon-logo.webp"}
            alt={siteSettings.siteName}
            width={178}
            height={55}
            suppressHydrationWarning
          />
        </a>
        <nav aria-label="Product page navigation">
          <a href="/">Home</a>
          <a className={section.href === "/brand-new" ? "active" : ""} href="/brand-new">
            Brand New
          </a>
          <a className={section.href === "/reconditioned" ? "active" : ""} href="/reconditioned">
            Reconditioned
          </a>
          <a className={section.href === "/pre-owned" ? "active" : ""} href="/pre-owned">
            Pre-Owned
          </a>
          <a className={section.href === "/pre-order" ? "active" : ""} href="/pre-order">
            Pre-Order
          </a>
          <a href="/send-requirements">Send Requirements</a>
        </nav>
        <a className="download-button cars-download" href="/stock-list.pdf" download>
          <Download size={17} />
          Download Stock List
        </a>
      </header>

      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href={section.href}>{section.label}</a>
        <span>/</span>
        <strong>{product.name}</strong>
      </nav>

      <ProductGallery gallery={product.gallery} hero={product.hero} productName={product.name} />

      <section className="product-heading-row">
        <div>
          {product.saleStatus === "Sold" ? <span className="product-sale-badge">Sold</span> : null}
          <h1>{product.name}</h1>
        </div>
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

          <ProductVideo productName={product.name} youtubeVideoUrl={product.youtubeVideoUrl} />
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
